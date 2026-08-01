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
import {
  worklist,
  documents,
  reportTemplates,
  modalities,
  criticalFindings,
  tatStats,
  bookingSlots,
  type WorklistItem,
} from "./radiology-data";

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

function priorityTone(p: WorklistItem["priority"]) {
  return p === "stat" ? "bad" : p === "urgent" ? "warn" : "mute";
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

/* ---------- 01 worklist ---------- */

export function WorklistPanel() {
  const [filter, setFilter] = useState<"all" | "stat" | "unreported">("all");
  const rows = worklist.filter((w) =>
    filter === "all"
      ? true
      : filter === "stat"
        ? w.priority === "stat"
        : !["reported", "verified"].includes(w.status),
  );

  return (
    <section>
      <PanelHeader
        index="01 / worklist"
        title="Modality worklist"
        note="Every requested study with priority, room, turnaround against SLA and the reporting radiologist."
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All ({worklist.length})</ActionButton>
            <ActionButton onClick={() => setFilter("stat")}>Stat</ActionButton>
            <ActionButton tone="solid" onClick={() => setFilter("unreported")}>
              Unreported
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--hairline)" }}>
        {tatStats.map((s) => (
          <div key={s.label} className="bg-background p-5">
            <p className="mono-label text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="mono-label text-muted-foreground mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="hairline-t overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="hairline-b">
            <tr>
              <Th>Accession</Th>
              <Th>Patient</Th>
              <Th>Study</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Room</Th>
              <Th>TAT / SLA</Th>
              <Th>Radiologist</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const breach = w.tatMin > w.slaMin;
              return (
                <tr key={w.accession} className="hairline-b hover:bg-foreground/[0.02]">
                  <Td>
                    <span className="mono-label">{w.accession}</span>
                  </Td>
                  <Td>
                    <p className="font-medium">{w.patient}</p>
                    <p className="mono-label text-muted-foreground">
                      {w.mrn} · {w.age}
                      {w.sex}
                    </p>
                  </Td>
                  <Td>
                    <p>{w.study}</p>
                    <p className="mono-label text-muted-foreground">
                      {w.modality} · requested {w.requested}
                    </p>
                  </Td>
                  <Td>
                    <Pill tone={priorityTone(w.priority)}>{w.priority}</Pill>
                  </Td>
                  <Td>
                    <span className="mono-label inline-flex items-center gap-2">
                      {w.status === "in-room" && (
                        <span className="bg-accent size-1.5 animate-pulse rounded-full" />
                      )}
                      {w.status}
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label">{w.room}</span>
                  </Td>
                  <Td>
                    <Pill tone={breach ? "bad" : "ok"}>
                      {w.tatMin}m / {w.slaMin}m
                    </Pill>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{w.radiologist}</span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
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
  const [accession, setAccession] = useState(worklist[0]!.accession);
  const [kind, setKind] = useState("PDF report");
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearInterval(t)), []);

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
        progress: badType || tooBig ? 0 : 4,
        error: badType
          ? "unsupported type — pdf, dcm, zip, jpg, png only"
          : tooBig
            ? "over 25 MB limit"
            : undefined,
      };
    });
    setItems((prev) => [...next, ...prev]);

    next
      .filter((n) => !n.error)
      .forEach((n) => {
        const t = window.setInterval(() => {
          setItems((prev) =>
            prev.map((it) =>
              it.id === n.id && it.progress < 100
                ? { ...it, progress: Math.min(100, it.progress + Math.random() * 18 + 6) }
                : it,
            ),
          );
        }, 320);
        timers.current.push(t);
        window.setTimeout(() => window.clearInterval(t), 9000);
      });
  }

  const done = items.filter((i) => !i.error && i.progress >= 100).length;

  return (
    <section>
      <PanelHeader
        index="02 / intake"
        title="Upload reports &amp; images"
        note="Attach signed PDF reports, scanned requests, prior studies or DICOM series to an accession. Files are checked for type and size before they enter the study record."
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
              dragging ? "border-accent bg-accent/5" : "border-[var(--hairline)]"
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
              attached to the selected accession and audit-logged.
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
            <p className="mono-label text-muted-foreground">
              destination: {accession} / {kind}
            </p>
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
                    <div className="bg-foreground/[0.06] mt-2 h-[3px] w-full">
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
          <label className="mono-label text-muted-foreground mt-4 block">Accession</label>
          <select
            value={accession}
            onChange={(e) => setAccession(e.target.value)}
            className="hairline mono-label mt-2 w-full bg-transparent px-3 py-2.5 outline-none"
          >
            {worklist.map((w) => (
              <option key={w.accession} value={w.accession}>
                {w.accession} — {w.patient} ({w.modality})
              </option>
            ))}
          </select>

          <label className="mono-label text-muted-foreground mt-4 block">Document type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="hairline mono-label mt-2 w-full bg-transparent px-3 py-2.5 outline-none"
          >
            {["PDF report", "Scanned request", "Prior report", "DICOM series", "Consent"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>

          <label className="mono-label text-muted-foreground mt-4 block">Note for record</label>
          <textarea
            rows={4}
            placeholder="e.g. outside imaging brought on CD by relative"
            className="hairline placeholder:text-muted-foreground mt-2 w-full resize-none bg-transparent p-3 text-sm outline-none"
          />

          <div className="hairline mt-5 p-3">
            <p className="mono-label text-muted-foreground">Checks applied</p>
            <ul className="mono-label mt-2 space-y-1.5">
              {[
                "type + size validation",
                "patient / accession match",
                "PHI watermark on export",
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

/* ---------- 03 reporting ---------- */

export function ReportingPanel() {
  const [tpl, setTpl] = useState(reportTemplates[0]!);
  const [body, setBody] = useState(reportTemplates[0]!.body);
  const [study] = useState(worklist[0]!);

  return (
    <section>
      <PanelHeader
        index="03 / reporting"
        title="Reporting desk"
        note="Structured report against the live study, template-driven, with critical-finding escalation and countersign."
        actions={
          <>
            <ActionButton>Save draft</ActionButton>
            <ActionButton tone="solid">Sign &amp; publish</ActionButton>
          </>
        }
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Current study</p>
          <p className="mt-2 font-mono text-lg">{study.study}</p>
          <p className="mono-label text-muted-foreground mt-1">
            {study.accession} · {study.patient} · {study.mrn}
          </p>
          <div className="hairline mt-4 p-2">
            <ScannerGlyph active />
            <p className="mono-label text-muted-foreground mt-1 text-center">
              {study.room} · series 4 · 312 images
            </p>
          </div>

          <p className="mono-label text-muted-foreground mt-5">Templates</p>
          <div className="mt-2 flex flex-col gap-0.5">
            {reportTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTpl(t);
                  setBody(t.body);
                }}
                className={`mono-label px-3 py-2 text-left transition-colors ${
                  tpl.id === t.id
                    ? "bg-accent/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-background p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="mono-label text-muted-foreground">Report body — {tpl.label}</p>
            <span className="mono-label text-muted-foreground">autosaved 12s ago</span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            className="hairline mt-3 w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton>Attach key image</ActionButton>
            <ActionButton>Request second read</ActionButton>
            <ActionButton>Flag critical finding</ActionButton>
            <span className="mono-label text-muted-foreground ml-auto">
              {body.trim().split(/\s+/).length} words · dictation off
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 04 archive ---------- */

export function ArchivePanel() {
  const [q, setQ] = useState("");
  const rows = documents.filter((d) =>
    `${d.name} ${d.patient} ${d.accession}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section>
      <PanelHeader
        index="04 / archive"
        title="Study archive"
        note="Every document attached to a study — reports, scanned requests, priors and DICOM series — with state, uploader and share controls."
        actions={
          <>
            <ActionButton>Export index</ActionButton>
            <ActionButton tone="solid">Bulk verify</ActionButton>
          </>
        }
      />

      <div className="hairline-b px-5 py-4 sm:px-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by file, patient or accession"
          className="hairline mono-label placeholder:text-muted-foreground w-full max-w-md bg-transparent px-3 py-2.5 outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="hairline-b">
            <tr>
              <Th>File</Th>
              <Th>Type</Th>
              <Th>Patient / accession</Th>
              <Th>Size</Th>
              <Th>Uploaded</Th>
              <Th>State</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="hairline-b hover:bg-foreground/[0.02]">
                <Td>
                  <span className="flex items-center gap-2">
                    <FileText className="text-accent size-3.5" />
                    <span className="font-mono text-sm">{d.name}</span>
                  </span>
                  {d.pages > 0 && (
                    <p className="mono-label text-muted-foreground mt-1">{d.pages} pages</p>
                  )}
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{d.kind}</span>
                </Td>
                <Td>
                  <p>{d.patient}</p>
                  <p className="mono-label text-muted-foreground">{d.accession}</p>
                </Td>
                <Td>
                  <span className="mono-label">{d.size}</span>
                </Td>
                <Td>
                  <p className="mono-label">{d.uploaded}</p>
                  <p className="mono-label text-muted-foreground">{d.by}</p>
                </Td>
                <Td>
                  <Pill
                    tone={
                      d.state === "verified" ? "ok" : d.state === "pending sign" ? "warn" : "bad"
                    }
                  >
                    {d.state}
                  </Pill>
                </Td>
                <Td>
                  <div className="text-muted-foreground flex items-center gap-3">
                    <button type="button" aria-label="Preview" className="hover:text-foreground">
                      <Eye className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Download" className="hover:text-foreground">
                      <Download className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Share" className="hover:text-foreground">
                      <Share2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      className="hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 05 critical findings ---------- */

export function CriticalPanel() {
  const [called, setCalled] = useState<Record<string, boolean>>(
    Object.fromEntries(criticalFindings.map((c) => [c.accession, c.called])),
  );

  return (
    <section>
      <PanelHeader
        index="05 / escalation"
        title="Critical findings"
        note="Closed-loop communication: a critical result is not done until a named clinician has acknowledged it by voice."
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {criticalFindings.map((c) => {
          const ack = called[c.accession];
          return (
            <div
              key={c.accession}
              className="bg-background flex flex-wrap items-center gap-4 p-5 sm:px-8"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${
                  ack ? "bg-accent" : "bg-destructive animate-pulse"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.finding}</p>
                <p className="mono-label text-muted-foreground mt-1">
                  {c.accession} · {c.patient} · flagged {c.at} · to {c.clinician}
                </p>
              </div>
              <Pill tone={ack ? "ok" : "bad"}>{ack ? "acknowledged" : "callback pending"}</Pill>
              <ActionButton
                tone={ack ? "ghost" : "solid"}
                onClick={() => setCalled((p) => ({ ...p, [c.accession]: true }))}
              >
                <span className="inline-flex items-center gap-2">
                  <PhoneCall className="size-3.5" />
                  {ack ? "Log repeat call" : "Mark called"}
                </span>
              </ActionButton>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 06 modalities ---------- */

export function ModalitiesPanel() {
  return (
    <section>
      <PanelHeader
        index="06 / equipment"
        title="Modalities &amp; dose"
        note="Scanner state, queue depth, uptime, dose index and next service window for every room in the department."
      />

      <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {modalities.map((m) => (
          <div key={m.room} className="bg-background p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg">{m.room}</p>
                <p className="mono-label text-muted-foreground">
                  {m.modality} · {m.vendor}
                </p>
              </div>
              <Pill
                tone={
                  m.state === "scanning"
                    ? "ok"
                    : m.state === "idle"
                      ? "mute"
                      : m.state === "maintenance"
                        ? "warn"
                        : "bad"
                }
              >
                {m.state}
              </Pill>
            </div>

            <ScannerGlyph active={m.state === "scanning"} />

            <dl className="mono-label mt-3 grid grid-cols-2 gap-y-2">
              <dt className="text-muted-foreground">Queue</dt>
              <dd className="text-right">{m.queue} studies</dd>
              <dt className="text-muted-foreground">Uptime 30d</dt>
              <dd className="text-right">{m.uptime}</dd>
              <dt className="text-muted-foreground">Dose index</dt>
              <dd className="text-right">{m.doseIndex}</dd>
              <dt className="text-muted-foreground">Next service</dt>
              <dd className="text-right">{m.nextService}</dd>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 07 booking ---------- */

export function BookingPanel() {
  return (
    <section>
      <PanelHeader
        index="07 / scheduling"
        title="Slot booking"
        note="Room-by-room slot ladder with open capacity, blocked maintenance windows and booked studies."
        actions={<ActionButton tone="solid">New booking</ActionButton>}
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {bookingSlots.map((s, i) => (
          <div
            key={`${s.time}-${s.room}-${i}`}
            className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8"
          >
            <span className="mono-label text-brass w-14 shrink-0">{s.time}</span>
            <span className="mono-label text-muted-foreground w-16 shrink-0">{s.room}</span>
            <div className="min-w-0 flex-1">
              <p className={s.state === "open" ? "text-muted-foreground text-sm" : "text-sm"}>
                {s.study}
              </p>
              {s.patient !== "—" && (
                <p className="mono-label text-muted-foreground mt-0.5">{s.patient}</p>
              )}
            </div>
            <Pill tone={s.state === "booked" ? "warn" : s.state === "open" ? "ok" : "bad"}>
              {s.state}
            </Pill>
            <ActionButton>{s.state === "open" ? "Book" : "Reschedule"}</ActionButton>
          </div>
        ))}
      </div>
    </section>
  );
}
