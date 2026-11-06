"use client";

import { useEffect, useState } from "react";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import { toast } from "sonner";
import { getOrdersAndMedsApi } from "@/lib/api/doctor";
import { getSocket } from "@/lib/socket";

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
  return (
    <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

/* ---------- 05 · Orders & meds ---------- */

export function OrdersPanel() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    getOrdersAndMedsApi()
      .then((res) => {
        const { orders = [], consultations = [] } = res.data || {};
        const combined = [
          ...orders.map((o: any) => ({ ...o, _type: "Order" })),
          ...consultations.flatMap((c: any) =>
            c.medicines.map((m: any) => ({
              ...m,
              _type: "Medicine",
              patient: c.patient,
            })),
          ),
        ];
        setDataList(combined);
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (socket) {
      socket.on("appointment_updated", loadData);
      return () => {
        socket.off("appointment_updated", loadData);
      };
    }
  }, []);

  return (
    <div className="pb-24">
      <DoctorHeader
        title="Orders"
        note="Lab orders and medicines from your completed notes."
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
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  Loading orders...
                </td>
              </tr>
            ) : dataList.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  No active orders or medicines.
                </td>
              </tr>
            ) : (
              dataList.map((o, i) => {
                const patName =
                  typeof o.patient === "object" ? o.patient?.name : "Unknown";
                const isMed = o._type === "Medicine";
                const detail = isMed
                  ? `${o.name} - ${o.dosage} (${o.frequency})`
                  : o.testName || "Diagnostic Test";

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
                      <span className="mono-label text-muted-foreground">
                        {o._type}
                      </span>
                    </Td>
                    <Td>
                      <Pill tone="ok">
                        {isMed ? "Dispensed" : o.status || "PENDING"}
                      </Pill>
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
