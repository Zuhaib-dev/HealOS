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
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/3"
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
