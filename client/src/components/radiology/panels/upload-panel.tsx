import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  UploadCloud,
  FileText,
  X,
  Check,
  TriangleAlert,
  PhoneCall,
  Download,
  Share2,
  Trash2,
  Eye,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import { fetchPendingOrdersApi, updateOrderStatusApi, uploadDiagnosticReportApi, DiagnosticOrderRecord } from "@/lib/api/radiology";
import { toast } from "sonner";

/* ---------- primitives ---------- */

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function priorityTone(p: DiagnosticOrderRecord["priority"]) {
  return p === "STAT" ? "bad" : p === "URGENT" ? "warn" : "mute";
}

/** Animated scanner glyph — hand-drawn SVG, no raster assets. */
function ScannerGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full">
      <rect
        x="8"
        y="12"
        width="104"
        height="48"
        fill="none"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      <circle cx="60" cy="36" r="17" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="36" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.8" />
      {active && (
        <motion.line
          x1="8"
          x2="112"
          y1="14"
          y2="14"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          animate={{ y1: [14, 58, 14], y2: [14, 58, 14] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}

/* ---------- 02 upload ---------- */

type Upload = {
  id: string;
  name: string;
  size: number;
  progress: number;
  error?: string | undefined;
};

const ACCEPT = ".pdf,.dcm,.zip,.jpg,.jpeg,.png";
const MAX_BYTES = 25 * 1024 * 1024;

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadPanel() {
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<Upload[]>([]);
  const [orders, setOrders] = useState<DiagnosticOrderRecord[]>([]);
  const [orderId, setOrderId] = useState("");
  const [comments, setComments] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPendingOrdersApi().then(res => {
      if (res.status === "success") {
        const pending = res.data.orders.filter(o => o.status !== "REPORTED");
        setOrders(pending);
        if (pending.length > 0 && !orderId) setOrderId(pending[0]._id);
      }
    }).catch(console.error);
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Upload[] = Array.from(files).map((f, i) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      const badType = !ACCEPT.split(",").includes(ext);
      const tooBig = f.size > MAX_BYTES;
      return {
        id: `${Date.now()}-${i}`,
        name: f.name,
        size: f.size,
        progress: badType || tooBig ? 0 : 0,
        error: badType
          ? "unsupported type — pdf, dcm, zip, jpg, png only"
          : tooBig
            ? "over 25 MB limit"
            : undefined,
        file: f,
      };
    });
    setItems((prev) => [...next, ...prev]);
  }

  const handleUpload = async () => {
    if (!orderId) {
      toast.error("Please select an order to attach to.");
      return;
    }
    const validItems = items.filter(i => !i.error && i.progress === 0);
    if (validItems.length === 0) return;

    setUploading(true);
    for (const item of validItems) {
      try {
        const formData = new FormData();
        formData.append("reportFile", (item as any).file);
        formData.append("comments", comments);
        
        const res = await uploadDiagnosticReportApi(orderId, formData);
        if (res.status === "success") {
          toast.success(`${item.name} uploaded successfully!`);
          setItems(prev => prev.map(p => p.id === item.id ? { ...p, progress: 100 } : p));
        }
      } catch (e) {
        toast.error(`Failed to upload ${item.name}`);
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, error: "Upload failed" } : p));
      }
    }
    setUploading(false);
  }

  const done = items.filter((i) => !i.error && i.progress >= 100).length;

  return (
    <section>
      <PanelHeader
        index="02 / intake"
        title="Upload reports &amp; images"
        note="Attach signed PDF reports, scanned requests, prior studies or DICOM series to an order. Files are checked for type and size before they enter the study record."
        actions={
          <>
            <ActionButton onClick={() => setItems([])}>Clear list</ActionButton>
            <ActionButton tone="solid" onClick={() => inputRef.current?.click()}>
              Choose files
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5 lg:col-span-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`relative grid place-items-center border border-dashed px-6 py-12 text-center transition-colors ${
              dragging ? "border-accent bg-accent/5" : "border-(--hairline)"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <UploadCloud className="text-accent mx-auto size-8" />
            </motion.div>
            <p className="mt-4 font-mono text-lg">Drop report files here</p>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              PDF, DICOM (.dcm), zipped series, JPG or PNG · up to 25 MB per file. Uploads are
              attached to the selected order and audit-logged.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mono-label bg-foreground text-background mt-5 px-4 py-2.5 transition-opacity hover:opacity-85"
            >
              Browse files
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="mono-label text-muted-foreground">
              {items.length} queued · {done} attached
            </p>
            {items.some(i => !i.error && i.progress === 0) && (
              <button 
                onClick={handleUpload}
                disabled={uploading}
                className="bg-accent text-accent-foreground px-4 py-1.5 rounded text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Queued Files"}
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
            {items.length === 0 && (
              <p className="bg-background text-muted-foreground p-5 text-sm">
                Nothing queued yet. Files you add appear here with live progress and validation.
              </p>
            )}
            {items.map((it) => (
              <div key={it.id} className="bg-background flex items-center gap-4 p-4">
                <FileText
                  className={`size-4 shrink-0 ${it.error ? "text-destructive" : "text-accent"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm">{it.name}</p>
                    <span className="mono-label text-muted-foreground shrink-0">
                      {humanSize(it.size)}
                    </span>
                  </div>
                  {it.error ? (
                    <p className="mono-label text-destructive mt-1">{it.error}</p>
                  ) : (
                    <div className="bg-foreground/6 mt-2 h-0.75 w-full">
                      <motion.div
                        className="bg-accent h-full"
                        animate={{ width: `${it.progress}%` }}
                        transition={{ ease: "linear", duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
                <span className="mono-label shrink-0">
                  {it.error ? (
                    <TriangleAlert className="text-destructive size-4" />
                  ) : it.progress >= 100 ? (
                    <Check className="text-brass size-4" />
                  ) : (
                    `${Math.round(it.progress)}%`
                  )}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${it.name}`}
                  onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Attach to</p>
          <label className="mono-label text-muted-foreground mt-4 block">Order</label>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="hairline mono-label mt-2 w-full bg-transparent px-3 py-2.5 outline-none"
          >
            {orders.map((w) => (
              <option key={w._id} value={w._id}>
                {w._id.slice(-6)} — {w.patient?.firstName} {w.patient?.lastName} ({w.testName})
              </option>
            ))}
          </select>

          <label className="mono-label text-muted-foreground mt-4 block">Note for record</label>
          <textarea
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="e.g. sample collected, all clear"
            className="hairline placeholder:text-muted-foreground mt-2 w-full resize-none bg-transparent p-3 text-sm outline-none"
          />

          <div className="hairline mt-5 p-3">
            <p className="mono-label text-muted-foreground">Checks applied</p>
            <ul className="mono-label mt-2 space-y-1.5">
              {[
                "type + size validation",
                "patient / order match",
                "immutable audit entry",
              ].map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <Check className="text-brass size-3" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
