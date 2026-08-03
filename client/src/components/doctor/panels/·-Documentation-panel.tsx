import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, TriangleAlert, PenLine, Send, X, CheckCircle2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import {
  fetchDoctorAppointmentsApi,
  updateAppointmentStatusApi,
  AppointmentRecord,
} from "@/lib/api/appointment";
import { toast } from "sonner";
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import {
  shiftStats,
  rounds,
  clinic,
  results,
  orders,
  noteTemplates,
  handovers,
  onCall,
} from "./doctor-data";

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

/** Animated vitals sparkline — drawn, never an image. */
function Vitals({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 30 - ((v - min) / Math.max(1, max - min)) * 26 - 2;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-24 shrink-0">
      <motion.polyline
        points={pts}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

function acuityPill(a: "critical" | "guarded" | "stable") {
  return a === "critical" ? (
    <Pill tone="bad">critical</Pill>
  ) : a === "guarded" ? (
    <Pill tone="warn">guarded</Pill>
  ) : (
    <Pill tone="ok">stable</Pill>
  );
}

/* ---------- 06 · Documentation ---------- */

export function NotesPanel() {
  const [template, setTemplate] = useState(noteTemplates[0]!);
  const [body, setBody] = useState(
    "SUBJECTIVE\n\nOBJECTIVE\n  Obs: \n  Exam: \n\nASSESSMENT\n\nPLAN\n  1. ",
  );
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PanelHeader
        index="06 / documentation"
        title="Clinical notes"
        note="Structured note capture with templates, so what you write once lands in the record, the ledger and the discharge letter."
        actions={
          <ActionButton
            tone="solid"
            onClick={() => {
              setSaved(true);
              window.setTimeout(() => setSaved(false), 1800);
            }}
          >
            {saved ? "Signed & filed" : "Sign note"}
          </ActionButton>
        }
      />
      <div className="grid lg:grid-cols-[220px_1fr]">
        <div className="hairline-b border-r border-(--hairline) p-4">
          <p className="mono-label text-muted-foreground">Templates</p>
          <div className="mt-3 flex flex-col gap-1">
            {noteTemplates.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTemplate(t)}
                className={`mono-label px-3 py-2 text-left ${
                  template === t
                    ? "bg-accent/12 text-brass"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 sm:p-8">
          <p className="mono-label text-muted-foreground">
            {template} · Jonas Vidal · PT-99401 · ICU-A 04
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            className="hairline mt-3 min-h-72 w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
          />
          <p className="mono-label text-muted-foreground mt-3">
            autosaved 12s ago · {body.length} chars · countersign required for ICU notes
          </p>
        </div>
      </div>
    </div>
  );
}
