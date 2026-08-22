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
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import { getOrdersAndMedsApi } from "@/lib/api/doctor";

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
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrdersAndMedsApi()
      .then(res => {
        const { orders = [], consultations = [] } = res.data || {};
        const combined = [
          ...orders.map((o: any) => ({ ...o, _type: "Order" })),
          ...consultations.flatMap((c: any) => c.medicines.map((m: any) => ({ ...m, _type: "Medicine", patient: c.patient })))
        ];
        setDataList(combined);
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

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
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading orders...</td>
              </tr>
            ) : dataList.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">No active orders or medicines.</td>
              </tr>
            ) : (
              dataList.map((o, i) => {
                const patName = typeof o.patient === "object" ? o.patient?.name : "Unknown";
                const isMed = o._type === "Medicine";
                const detail = isMed ? `${o.name} - ${o.dosage} (${o.frequency})` : (o.testName || "Diagnostic Test");
                
                return (
                  <tr key={i} className="hairline-b">
                    <Td>
                      <span className="mono-label">{o._id || `MED-${i}`}</span>
                    </Td>
                    <Td>
                      <span className="font-medium">{patName}</span>
                    </Td>
                    <Td>{detail}</Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">{o._type}</span>
                    </Td>
                    <Td>
                      <Pill tone="ok">{isMed ? "Dispensed" : o.status || "PENDING"}</Pill>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
