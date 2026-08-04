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
import { getAssignedPatientsApi } from "@/lib/api/doctor";

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
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssignedPatientsApi()
      .then(res => setPatients(res.data.patients || []))
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PanelHeader
        index="02 / caseload"
        title="My patients"
        note="Your list by bed, with NEWS2 trend, working diagnosis and what remains before handover."
        actions={<ActionButton tone="solid">Add to list</ActionButton>}
      />
      <div className="grid xl:grid-cols-2">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground col-span-2">No patients assigned.</div>
        ) : (
          patients.map((p) => {
            return (
              <motion.article
                key={p._id}
                layout
                className="hairline-l hairline-b px-5 py-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-mono text-lg font-bold">{p.name}</h3>
                      <Pill tone="ok">Assigned</Pill>
                    </div>
                    <p className="mono-label text-muted-foreground mt-1">
                      {p.email} · {p.phone || "No phone"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button type="button" className="mono-label hairline flex items-center gap-1.5 px-3 py-2">
                    <PenLine className="size-3" /> write note
                  </button>
                </div>
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}
