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
import { getScheduleApi } from "@/lib/api/doctor";

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

/* ---------- 08 · Rota ---------- */

export function RotaPanel() {
  const [scheduleList, setScheduleList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScheduleApi()
      .then(res => setScheduleList(res.data.schedule || []))
      .catch(() => toast.error("Failed to load schedule"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PanelHeader
        index="08 / rota"
        title="My rota"
        note="This week's shifts, on-call cover and where you are expected."
        actions={<ActionButton>Request swap</ActionButton>}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground col-span-full">Loading schedule...</div>
        ) : scheduleList.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground col-span-full">No scheduled shifts found.</div>
        ) : (
          scheduleList.map((d) => {
            const tone =
              d.shiftType === "Night"
                ? "bg-foreground/[0.06]"
                : d.shiftType === "On-call"
                  ? "bg-destructive/10"
                  : d.shiftType === "Day"
                    ? "bg-accent/10"
                    : "";
            return (
              <div key={d._id} className={`hairline-l hairline-b px-5 py-6 ${tone}`}>
                <p className="mono-label text-muted-foreground">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="mt-3 font-mono text-lg font-bold">{d.shiftType}</p>
                <p className="mono-label text-muted-foreground mt-2">{d.department}</p>
              </div>
            );
          })
        )}
      </div>
      <div className="px-5 py-6 sm:px-8">
        <p className="mono-label text-muted-foreground">
          58h rostered · 2 nights · compliant with rest requirements
        </p>
      </div>
    </div>
  );
}
