"use client";

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
import { getDashboardStatsApi } from "@/lib/api/doctor";

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
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStatsApi()
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        toast.error("Failed to load dashboard stats");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const statCards = [
    { label: "Patients under you", value: stats?.activePatientsCount || 0, note: "Active patients" },
    { label: "Clinic slots today", value: stats?.appointmentsToday || 0, note: "Scheduled for today" },
    { label: "Results awaiting sign", value: stats?.resultsAwaiting || 0, note: "0 flagged abnormal" },
    { label: "Time on shift", value: stats?.timeOnShift || "0h 0m", note: "Started recently" },
  ];
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    import("@/lib/api/doctor").then(({ getAssignedPatientsApi }) => {
      getAssignedPatientsApi().then(res => setPatients(res.data.patients || []));
    });
  }, []);

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <div
              key={i}
              className="bg-foreground/[0.02] border border-(--hairline) rounded flex flex-col justify-between p-4 min-h-[110px]"
            >
              <span className="mono-label text-muted-foreground">{s.label}</span>
              <div>
                <div className="text-3xl font-medium tracking-tight mt-3">{loading ? "-" : s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{loading ? "Loading..." : s.note}</div>
              </div>
            </div>
          ))}
        </div>

      <div className="hairline-b grid lg:grid-cols-2">
        <div className="hairline-l px-5 py-6">
          <p className="mono-label text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="size-3.5" /> Recent Patients
          </p>
          <div className="mt-4 space-y-3">
            {patients.length > 0 ? patients.slice(0, 5).map((p) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="hairline flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="mono-label text-muted-foreground">
                    {p.email} · {p.phone || "No phone"}
                  </p>
                </div>
                <ActionButton>View</ActionButton>
              </motion.div>
            )) : (
              <div className="p-4 text-center text-sm text-muted-foreground border border-dashed border-(--hairline) rounded">
                No active patients found.
              </div>
            )}
          </div>
        </div>
        <div className="hairline-l px-5 py-6">
          <p className="mono-label flex items-center gap-2 text-muted-foreground">
            <PenLine className="size-3.5" /> Pending Actions
          </p>
          <div className="mt-4 space-y-2">
            <div className="p-4 text-center text-sm text-muted-foreground border border-dashed border-(--hairline) rounded">
              You're all caught up!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
