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

/* ---------- 02 · My patients ---------- */

export function RoundsPanel() {
  const [seen, setSeen] = useState<string[]>(rounds.filter((r) => r.seen).map((r) => r.mrn));

  return (
    <div>
      <PanelHeader
        index="02 / caseload"
        title="My patients"
        note="Your list by bed, with NEWS2 trend, working diagnosis and what remains before handover."
        actions={<ActionButton tone="solid">Add to list</ActionButton>}
      />
      <div className="grid xl:grid-cols-2">
        {rounds.map((p) => {
          const done = seen.includes(p.mrn);
          return (
            <motion.article
              key={p.mrn}
              layout
              className="hairline-l hairline-b px-5 py-5"
              animate={{ opacity: done ? 0.6 : 1 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-mono text-lg font-bold">{p.name}</h3>
                    {acuityPill(p.acuity)}
                  </div>
                  <p className="mono-label text-muted-foreground mt-1">
                    {p.mrn} · {p.age}
                    {p.sex} · {p.bed} · LOS {p.los}
                  </p>
                </div>
                <Vitals series={p.vitals} />
              </div>

              <p className="mt-4 text-sm">{p.dx}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`mono-label ${p.news2 >= 5 ? "text-destructive" : "text-brass"}`}>
                  NEWS2 {p.news2}
                </span>
                {p.tasks.map((t) => (
                  <span key={t} className="mono-label bg-foreground/5 px-2 py-1">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSeen((s) => (done ? s.filter((m) => m !== p.mrn) : [...s, p.mrn]))
                  }
                  className={`mono-label flex items-center gap-1.5 px-3 py-2 ${
                    done ? "bg-accent/12 text-brass" : "hairline"
                  }`}
                >
                  <Check className="size-3" /> {done ? "reviewed" : "mark reviewed"}
                </button>
                <button type="button" className="mono-label hairline flex items-center gap-1.5 px-3 py-2">
                  <PenLine className="size-3" /> write note
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
