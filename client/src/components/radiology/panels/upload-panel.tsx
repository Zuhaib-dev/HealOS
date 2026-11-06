"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileText,
  X,
  Check,
  TriangleAlert,
  Search,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FolderUp,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import {
  fetchPendingOrdersApi,
  uploadDiagnosticReportApi,
  DiagnosticOrderRecord,
} from "@/lib/api/radiology";
import { toast } from "sonner";

type Upload = {
  id: string;
  name: string;
  size: number;
  progress: number;
  error?: string | undefined;
  file?: File;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadOrders = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetchPendingOrdersApi();
      if (res.status === "success") {
        const pending = (res.data.orders || []).filter(
          (o) => o.status !== "REPORTED",
        );
        setOrders(pending);
        if (pending.length > 0 && !orderId) {
          setOrderId(pending[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load active orders");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Upload[] = Array.from(files).map((f, i) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      const badType = !ACCEPT.split(",").includes(ext);
      const tooBig = f.size > MAX_BYTES;
      return {
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        name: f.name,
        size: f.size,
        progress: 0,
        error: badType
          ? "Unsupported format (PDF, DCM, ZIP, JPG, PNG only)"
          : tooBig
            ? "File exceeds 25 MB maximum limit"
            : undefined,
        file: f,
      };
    });
    setItems((prev) => [...next, ...prev]);
  }

  const handleUpload = async () => {
    if (!orderId) {
      toast.error("Please select a diagnostic study to attach these files to.");
      return;
    }
    const validItems = items.filter((i) => !i.error && i.progress === 0);
    if (validItems.length === 0) {
      toast.error("No valid unuploaded files in queue.");
      return;
    }

    setUploading(true);
    for (const item of validItems) {
      try {
        const formData = new FormData();
        if (item.file) {
          formData.append("reportFile", item.file);
        }
        formData.append(
          "comments",
          comments || "Radiology scan report attachment",
        );

        const res = await uploadDiagnosticReportApi(orderId, formData);
        if (res.status === "success") {
          toast.success(`${item.name} uploaded successfully!`);
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, progress: 100 } : p)),
          );
        }
      } catch (e) {
        toast.error(`Failed to upload ${item.name}`);
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, error: "Upload failed" } : p,
          ),
        );
      }
    }
    setUploading(false);
    await loadOrders(true);
  };

  const doneCount = items.filter((i) => !i.error && i.progress >= 100).length;
  const pendingUploadCount = items.filter(
    (i) => !i.error && i.progress === 0,
  ).length;

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return orders;
    const q = orderSearch.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.accessionNumber?.toLowerCase().includes(q) ||
        o.testName?.toLowerCase().includes(q) ||
        o.patient?.firstName?.toLowerCase().includes(q) ||
        o.patient?.lastName?.toLowerCase().includes(q),
    );
  }, [orders, orderSearch]);

  const selectedOrderObj = orders.find((o) => o._id === orderId);

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="02 / intake & pacs upload"
        title="Upload Diagnostic Reports & Series"
        note="Attach signed PDF reports, scanned physician orders, priors, or DICOM series directly into the study master record."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setItems([])}
              disabled={items.length === 0}
              className="px-3 py-1.5 rounded-lg border border-border/70 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              Clear Queue
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors"
            >
              Browse Files
            </button>
          </div>
        }
      />

      <div className="flex-1 grid gap-px lg:grid-cols-3 bg-border/60">
        {/* Left 2 Cols: Drag & Drop Zone and Queued Files */}
        <div className="bg-background p-5 sm:p-6 lg:col-span-2 flex flex-col justify-between space-y-5">
          <div>
            {/* Drag Drop Box */}
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
              className={`relative grid place-items-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
                dragging
                  ? "border-primary bg-primary/5 scale-[1.005]"
                  : "border-border/80 hover:border-primary/50 bg-card/30"
              }`}
            >
              <input
                id="radiology-file-upload-input"
                aria-label="Upload diagnostic report files"
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <UploadCloud className="size-7" />
              </div>
              <p className="font-mono text-base font-bold text-foreground">
                Drag &amp; Drop Diagnostic Reports or Series
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Supported formats: PDF, DICOM (.dcm), ZIP archives, JPG, PNG
                (Max 25 MB per file).
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
              >
                Select Files from Computer
              </button>
            </div>

            {/* Queue Counter and Action */}
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">
                {items.length} queued · {doneCount} uploaded
              </span>
              {pendingUploadCount > 0 && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || !orderId}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Uploading to Record...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>
                        Upload {pendingUploadCount} File
                        {pendingUploadCount === 1 ? "" : "s"}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Files List */}
            <div className="mt-4 space-y-2">
              {items.length === 0 ? (
                <p className="p-8 text-center text-xs text-muted-foreground rounded-xl border border-border/60 bg-muted/10">
                  No files queued yet. Drop files above to attach them to a
                  patient study.
                </p>
              ) : (
                items.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl border border-border/70 bg-card flex items-center gap-3 shadow-2xs"
                  >
                    <div
                      className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                        it.error
                          ? "bg-rose-500/15 text-rose-600"
                          : it.progress >= 100
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      <FileText className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate max-w-sm">
                          {it.name}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          {humanSize(it.size)}
                        </span>
                      </div>

                      {it.error ? (
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                          {it.error}
                        </p>
                      ) : (
                        <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${it.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {it.progress >= 100 ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : it.error ? (
                        <TriangleAlert className="size-4 text-rose-600" />
                      ) : null}

                      <button
                        type="button"
                        aria-label={`Remove ${it.name}`}
                        onClick={() =>
                          setItems((prev) => prev.filter((p) => p.id !== it.id))
                        }
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Order Destination & Notes */}
        <div className="bg-card/40 p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="font-mono text-sm font-bold text-foreground">
              Attach to Examination Study
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select the patient accession record to receive this document.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="radiology-upload-order"
                className="text-xs font-semibold text-foreground block mb-1"
              >
                Target Study Requisition
              </label>
              <select
                id="radiology-upload-order"
                aria-label="Order selection"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/25"
              >
                {orders.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.accessionNumber || w._id.slice(-6)} ·{" "}
                    {w.patient?.firstName} {w.patient?.lastName} ({w.testName})
                  </option>
                ))}
              </select>
            </div>

            {selectedOrderObj && (
              <div className="p-3.5 rounded-xl border border-border/70 bg-background text-xs space-y-1">
                <p className="font-bold text-foreground">
                  {selectedOrderObj.patient?.firstName}{" "}
                  {selectedOrderObj.patient?.lastName}
                </p>
                <p className="text-muted-foreground">
                  Procedure:{" "}
                  <strong className="text-foreground">
                    {selectedOrderObj.testName}
                  </strong>
                </p>
                <p className="font-mono text-[11px] text-primary font-semibold">
                  Accession:{" "}
                  {selectedOrderObj.accessionNumber ||
                    selectedOrderObj._id.slice(-8)}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="radiology-upload-note"
                className="text-xs font-semibold text-foreground block mb-1"
              >
                Radiologist Report Comments / Findings
              </label>
              <textarea
                id="radiology-upload-note"
                aria-label="Note for record"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g. Non-contrast study completed. Normal lung parenchyma, no infiltrates or pleural effusion."
                className="w-full rounded-xl border border-border/80 bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/25 resize-none"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Automated Integrity Verification</span>
              </p>
              <p className="text-[11px]">
                Uploaded documents receive a cryptographic SHA-256 hash, are
                logged to the clinical audit trail, and are made immediately
                accessible to the referring physician.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
