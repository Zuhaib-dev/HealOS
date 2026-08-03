"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TriangleAlert, ShieldCheck } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill, StatGrid, Td, Th } from "@/components/workspace/ui";
import {
  fetchPendingPrescriptionsApi,
  dispenseMedicineApi,
  PendingPrescriptionRecord,
  MedicineRecord,
} from "@/lib/api/pharmacy";
import { toast } from "sonner";


/* ---------- 01 e-prescription queue ---------- */

export function RxQueuePanel() {
  const [rows, setRows] = useState<PendingPrescriptionRecord[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPrescriptions = async () => {
    try {
      const res = await fetchPendingPrescriptionsApi();
      if (res.success) {
        setRows(res.prescriptions);
      }
    } catch (err) {
      console.error("Failed to load prescriptions", err);
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const handleDispense = async (consultationId: string, medicineId: string) => {
    try {
      const res = await dispenseMedicineApi(consultationId, medicineId);
      if (res.success) {
        toast.success(res.message || "Medicine dispensed");
        // Reload list
        loadPrescriptions();
      } else {
        toast.error(res.message || "Failed to dispense");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  if (loading) {
    return <div className="p-8 mono-label text-muted-foreground animate-pulse">Loading queue...</div>;
  }

  const pharmacyStats = [
    { label: "Prescriptions queued", value: String(rows.length), note: "needs dispensing" },
    { label: "Items dispensed today", value: "...", note: "data not connected" },
  ];

  return (
    <section>
      <PanelHeader
        index="01 / queue"
        title="e-Prescription queue"
        note="Every inbound script from wards and OPD, moving through screen → pick → check → dispense with clinical alerts attached."
        actions={
          <>
            <ActionButton onClick={loadPrescriptions}>Refresh</ActionButton>
          </>
        }
      />

      <StatGrid stats={pharmacyStats} />

      <div className="hairline-t grid gap-px" style={{ background: "var(--hairline)" }}>
        {rows.length === 0 && (
          <div className="p-8 text-center text-muted-foreground mono-label">
            No pending prescriptions at this time.
          </div>
        )}
        
        {rows.map((rx) => {
          const open = openId === rx._id;
          const undispensedCount = rx.medicines.filter(m => !m.isDispensed).length;
          
          return (
            <div key={rx._id} className="bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mono-label text-accent/80">
                    {rx._id.slice(-8).toUpperCase()} · received {new Date(rx.createdAt).toLocaleTimeString()}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold">{rx.patient?.name || "Unknown Patient"}</p>
                  <p className="mono-label text-muted-foreground">
                    Dr. {rx.doctor?.name || "Unknown Doctor"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="warn">
                    {undispensedCount} pending item(s)
                  </Pill>
                </div>
              </div>

              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <div className="hairline overflow-x-auto">
                      <table className="w-full">
                        <thead className="hairline-b">
                          <tr>
                            <Th>Drug</Th>
                            <Th>Dose / frequency</Th>
                            <Th>Duration</Th>
                            <Th>Status</Th>
                            <Th>Action</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {rx.medicines.map((it) => (
                            <tr key={it._id} className="hairline-b last:border-b-0">
                              <Td>{it.name}</Td>
                              <Td>
                                <span className="font-mono">{it.dosage}</span>
                                <span className="mono-label text-muted-foreground ml-2">{it.frequency}</span>
                              </Td>
                              <Td>{it.duration}</Td>
                              <Td>
                                <Pill tone={it.isDispensed ? "ok" : "warn"}>
                                  {it.isDispensed ? "dispensed" : "pending"}
                                </Pill>
                              </Td>
                              <Td>
                                {!it.isDispensed && (
                                  <ActionButton tone="solid" onClick={() => handleDispense(rx._id, it._id)}>
                                    Dispense
                                  </ActionButton>
                                )}
                                {it.isDispensed && <span className="mono-label text-muted-foreground">Done ✓</span>}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="hairline p-4">
                      <p className="mono-label text-muted-foreground">Clinical screening</p>
                      <ul className="mt-3 space-y-3">
                        <li className="mono-label text-brass">No interactions detected (simulated)</li>
                      </ul>
                      <p className="mono-label text-brass mt-4">
                        <ShieldCheck className="mr-1 inline size-3" />
                        Counselling required at handout
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton onClick={() => setOpenId(open ? null : rx._id)}>
                  {open ? "Collapse" : "Open script"}
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DispensePanel() {
  return (
    <section>
      <PanelHeader
        index="02 / dispense"
        title="Dispense & counsel"
        note="Label generation, second-check and the structured counselling script."
      />
      <div className="bg-background p-8">
        <p className="mono-label text-muted-foreground">
          Use the Rx Queue to directly dispense medications. This panel is reserved for future advanced counselling flows.
        </p>
      </div>
    </section>
  );
}
