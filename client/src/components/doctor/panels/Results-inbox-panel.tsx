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

/* ---------- 04 · Results inbox ---------- */

export function ResultsPanel() {
  const [signed, setSigned] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "critical" | "unsigned">("all");

  const rows = results.filter((r) =>
    filter === "critical"
      ? r.flag === "critical"
      : filter === "unsigned"
        ? !signed.includes(r.id)
        : true,
  );

  return (
    <div>
      <PanelHeader
        index="04 / results"
        title="Results inbox"
        note="Labs, imaging and pathology waiting on your signature — criticals surface at the top."
        actions={
          <ActionButton tone="solid" onClick={() => setSigned(results.map((r) => r.id))}>
            Sign all normal
          </ActionButton>
        }
      />
      <div className="hairline-b flex gap-1 px-5 py-3 sm:px-8">
        {(
          [
            ["all", "All"],
            ["critical", "Critical"],
            ["unsigned", "Unsigned"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`mono-label px-3 py-1.5 ${
              filter === id
                ? "bg-accent/12 text-brass"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-205">
          <thead className="hairline-b">
            <tr>
              <Th>At</Th>
              <Th>Patient</Th>
              <Th>Test</Th>
              <Th>Kind</Th>
              <Th>Value</Th>
              <Th>Flag</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSigned = signed.includes(r.id);
              return (
                <motion.tr key={r.id} layout className="hairline-b">
                  <Td>
                    <span className="mono-label">{r.at}</span>
                  </Td>
                  <Td>
                    <span className="block font-medium">{r.patient}</span>
                    <span className="mono-label text-muted-foreground">{r.mrn}</span>
                  </Td>
                  <Td>{r.test}</Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{r.kind}</span>
                  </Td>
                  <Td>
                    <span
                      className={`mono-label ${r.flag === "critical" ? "text-destructive" : ""}`}
                    >
                      {r.value}
                    </span>
                  </Td>
                  <Td>
                    {r.flag === "critical" ? (
                      <Pill tone="bad">critical</Pill>
                    ) : r.flag === "abnormal" ? (
                      <Pill tone="warn">abnormal</Pill>
                    ) : (
                      <Pill tone="ok">normal</Pill>
                    )}
                  </Td>
                  <Td>
                    {isSigned ? (
                      <Pill tone="mute">signed</Pill>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSigned((s) => [...s, r.id])}
                        className="mono-label hairline px-3 py-1.5"
                      >
                        acknowledge
                      </button>
                    )}
                  </Td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
