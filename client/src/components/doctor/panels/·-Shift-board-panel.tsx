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

/* ---------- 01 · Shift board ---------- */

export function ShiftPanel() {
  const { user } = useAuthStore();
  const critical = rounds.filter((r) => r.acuity === "critical");
  const tasks = rounds.flatMap((r) => r.tasks.map((t) => ({ t, who: r.name, bed: r.bed })));

  return (
    <div>
      <PanelHeader
        index="01 / shift"
        title={`Shift Board — Dr. ${user?.name || "Clinician"}`}
        note={`Duty Designation: ${user?.role || "DOCTOR"} · Email: ${user?.email || "N/A"}`}
        actions={
          <>
            <ActionButton>Print round sheet</ActionButton>
            <ActionButton tone="solid">Start ward round</ActionButton>
          </>
        }
      />

      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        {shiftStats.map((s) => (
          <div key={s.label} className="hairline-l px-5 py-5">
            <p className="mono-label text-muted-foreground">{s.label}</p>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="mono-label text-muted-foreground mt-2">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="hairline-b grid lg:grid-cols-2">
        <div className="hairline-l px-5 py-6">
          <p className="mono-label text-destructive flex items-center gap-2">
            <TriangleAlert className="size-3.5" /> Deteriorating — see first
          </p>
          <div className="mt-4 space-y-3">
            {critical.map((p) => (
              <motion.div
                key={p.mrn}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="hairline flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="mono-label text-muted-foreground">
                    {p.bed} · {p.dx}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Vitals series={p.vitals} />
                  <span className="mono-label text-destructive whitespace-nowrap">
                    NEWS2 {p.news2}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="hairline-l px-5 py-6">
          <p className="mono-label text-muted-foreground">Open tasks</p>
          <div className="mt-4">
            {tasks.map((t) => (
              <label
                key={t.t}
                className="hairline-b flex cursor-pointer items-center gap-3 py-3 last:border-b-0"
              >
                <input type="checkbox" className="accent-(--color-accent)" />
                <span className="text-sm">{t.t}</span>
                <span className="mono-label text-muted-foreground ml-auto">{t.bed}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
