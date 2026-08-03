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

/* ---------- 05 · Orders & meds ---------- */

export function OrdersPanel() {
  const [state, setState] = useState<Record<string, string>>(
    Object.fromEntries(orders.map((o) => [o.id, o.state])),
  );

  return (
    <div>
      <PanelHeader
        index="05 / orders"
        title="Orders & prescriptions"
        note="Draft, active and signed orders across your caseload. Signing pushes to pharmacy and the ward instantly."
        actions={<ActionButton tone="solid">New order</ActionButton>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-190">
          <thead className="hairline-b">
            <tr>
              <Th>Order</Th>
              <Th>Patient</Th>
              <Th>Detail</Th>
              <Th>Kind</Th>
              <Th>State</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const s = state[o.id];
              return (
                <tr key={o.id} className="hairline-b">
                  <Td>
                    <span className="mono-label">{o.id}</span>
                  </Td>
                  <Td>
                    <span className="font-medium">{o.patient}</span>
                  </Td>
                  <Td>{o.detail}</Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{o.kind}</span>
                  </Td>
                  <Td>
                    {s === "signed" ? (
                      <Pill tone="ok">signed</Pill>
                    ) : s === "active" ? (
                      <Pill tone="warn">active</Pill>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setState((p) => ({ ...p, [o.id]: "signed" }))}
                        className="mono-label hairline px-3 py-1.5"
                      >
                        sign draft
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
