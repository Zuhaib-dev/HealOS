import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Check, X, TriangleAlert } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  approvals,
  staff,
  wards,
  audit,
  invoices,
  supplies,
  throughput,
} from "../admin-data";
import { ActionButton, PanelHeader } from "../admin-shell";

/* ---------- shared primitives ---------- */

function Metric({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: string;
  delta?: string;
  suffix?: string;
}) {
  return (
    <div className="hairline-l px-5 py-5">
      <p className="mono-label text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
        {value}
        {suffix ? <span className="text-muted-foreground text-base"> {suffix}</span> : null}
      </p>
      {delta ? (
        <p className="mono-label text-brass mt-2 flex items-center gap-1">
          <ArrowUpRight className="size-3" />
          {delta}
        </p>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-b overflow-x-auto">
      <table className="w-full min-w-180 border-collapse">{children}</table>
    </div>
  );
}


/* ---------- 01 overview ---------- */

function Throughput() {
  const max = Math.max(...throughput);
  const points = throughput
    .map((v, i) => `${(i / (throughput.length - 1)) * 100},${40 - (v / max) * 34}`)
    .join(" ");

  return (
    <div className="hairline-b px-5 py-6 sm:px-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="mono-label text-muted-foreground">Admissions throughput / 14 days</p>
          <p className="mt-2 font-mono text-2xl font-bold">
            {throughput[throughput.length - 1]}
            <span className="text-muted-foreground text-sm"> today</span>
          </p>
        </div>
        <p className="mono-label text-brass">peak {max}</p>
      </div>

      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-5 h-32 w-full">
        {[10, 20, 30].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--hairline)" strokeWidth="0.2" />
        ))}
        <motion.polyline
          points={`0,40 ${points} 100,40`}
          fill="color-mix(in oklab, var(--color-accent) 12%, transparent)"
          stroke="none"
        />
        <motion.polyline
          points={points}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        {throughput.map((v, i) => (
          <motion.circle
            key={i}
            cx={(i / (throughput.length - 1)) * 100}
            cy={40 - (v / max) * 34}
            r="0.6"
            fill="var(--color-accent)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.4, delay: i * 0.12, repeat: Infinity }}
          />
        ))}
      </svg>
    </div>
  );
}

function OccupancyGauge() {
  const total = wards.reduce((a, w) => a + w.total, 0);
  const used = wards.reduce((a, w) => a + w.used, 0);
  const pct = Math.round((used / total) * 100);
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <div className="hairline-l flex items-center gap-6 px-5 py-6">
      <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--hairline)" strokeWidth="6" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div>
        <p className="mono-label text-muted-foreground">Bed occupancy</p>
        <p className="mt-2 font-mono text-3xl font-bold">{pct}%</p>
        <p className="mono-label text-muted-foreground mt-2">
          {used} of {total} beds in service
        </p>
      </div>
    </div>
  );
}

import { fetchFacilityStatsApi, FacilityStatsData } from "@/lib/api/admin";

export function OverviewPanel() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<FacilityStatsData | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetchFacilityStatsApi();
        if (res.success && res.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error("Failed to load facility stats", err);
      }
    };
    loadStats();
  }, []);

  return (
    <section>
      <PanelHeader
        index="01 / OVERVIEW"
        title={`Facility command — ${user?.name || "Superadmin"}`}
        note={`Role: ${user?.role || "ADMIN"} · System Administrator: ${user?.email || "N/A"}`}
        actions={
          <>
            <ActionButton>Export shift report</ActionButton>
            <ActionButton tone="solid">Broadcast notice</ActionButton>
          </>
        }
      />

      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Registered users" value={stats ? String(stats.totalUsers) : "..."} delta="MongoDB Atlas live" />
        <Metric label="Active patients" value={stats ? String(stats.totalPatients) : "..."} delta="Health profiles complete" />
        <Metric label="Approved clinicians" value={stats ? String(stats.totalClinicians) : "..."} delta="Doctors & Radiologists" />
        <Metric label="Total appointments" value={stats ? String(stats.totalAppointments) : "..."} delta="Booked consultations" />
      </div>

      <div className="hairline-b grid lg:grid-cols-[1.6fr_1fr]">
        <Throughput />
        <OccupancyGauge />
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="hairline-b px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Queue requiring you</p>
          <ul className="mt-4 space-y-3">
            {[
              ["4 clinician credentials", "awaiting verification"],
              ["2 disputed invoices", "over $10k exposure"],
              ["1 security incident", "IP blocked at 06:33"],
              ["3 supplies below reorder", "pharmacy + blood bank"],
            ].map(([a, b]) => (
              <li key={a} className="hairline-b flex items-center justify-between pb-3">
                <span className="text-sm">{a}</span>
                <span className="mono-label text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hairline-b hairline-l px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Department load index</p>
          <div className="mt-5 space-y-4">
            {[
              ["Emergency", 92],
              ["Critical care", 87],
              ["Surgery", 74],
              ["Radiology", 61],
              ["Maternity", 48],
            ].map(([label, v]) => (
              <div key={label as string}>
                <div className="mono-label flex justify-between">
                  <span>{label}</span>
                  <span className="text-brass">{v}</span>
                </div>
                <div className="bg-foreground/[0.07] mt-2 h-1.5">
                  <motion.div
                    className="bg-accent h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${v as number}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import {
  fetchPendingOnboardingRequestsApi,
  approveOnboardingRequestApi,
  rejectOnboardingRequestApi,
  ProfessionalProfileData,
} from "@/lib/api/onboarding";
import { toast } from "sonner";
