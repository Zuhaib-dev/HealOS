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
} from "../doctor-data";

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

/* ---------- 07 · Handover ---------- */

export function HandoverPanel() {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);

  return (
    <div>
      <PanelHeader
        index="07 / handover"
        title="Handover & messages"
        note="Everything the outgoing team flagged, plus what you want the next shift to know."
      />
      <div className="grid lg:grid-cols-[1fr_360px]">
        <div className="hairline-l px-5 py-6 sm:px-8">
          {handovers.map((h) => (
            <motion.div
              key={h.at}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="hairline-b py-4"
            >
              <div className="flex items-center gap-3">
                <span className="mono-label text-accent/80">{h.at}</span>
                <span className="mono-label">{h.from}</span>
                {h.priority === "high" ? <Pill tone="bad">priority</Pill> : null}
              </div>
              <p className="mt-2 text-sm">{h.text}</p>
            </motion.div>
          ))}
          {sent.map((s, i) => (
            <div key={i} className="hairline-b py-4">
              <div className="flex items-center gap-3">
                <span className="mono-label text-accent/80">now</span>
                <span className="mono-label">You</span>
              </div>
              <p className="mt-2 text-sm">{s}</p>
            </div>
          ))}
        </div>
        <div className="hairline-l px-5 py-6">
          <p className="mono-label text-muted-foreground">Add handover note</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. ICU-A 04 — repeat ABG at 12:00, escalate if lactate rising"
            className="hairline placeholder:text-muted-foreground mt-3 min-h-32 w-full resize-y bg-transparent p-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!draft.trim()) return;
              setSent((s) => [...s, draft.trim()]);
              setDraft("");
            }}
            className="mono-label bg-foreground text-background mt-3 flex items-center gap-2 px-3.5 py-2"
          >
            <Send className="size-3" /> Post to handover
          </button>
        </div>
      </div>
    </div>
  );
}
