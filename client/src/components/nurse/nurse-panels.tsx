"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill, StatGrid, Td, Th } from "@/components/workspace/ui";
import {
  fetchVitalsQueueApi,
  recordVitalsApi,
  VitalsQueueItem,
} from "@/lib/api/nurse";
import { toast } from "sonner";

/* ---------- 01 vitals rounds ---------- */

export function VitalsRoundsPanel() {
  const [queue, setQueue] = useState<VitalsQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    hr: "",
    rr: "",
    spo2: "",
    temp: "",
    bp: "",
    weight: "",
    height: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadQueue = async () => {
    try {
      const res = await fetchVitalsQueueApi();
      if (res.success) {
        setQueue(res.queue);
      }
    } catch (err) {
      console.error("Failed to load vitals queue", err);
      toast.error("Failed to load vitals queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleSaveVitals = async (item: VitalsQueueItem) => {
    setSaving(true);
    try {
      const res = await recordVitalsApi({
        patientId: item.appointment.patient._id,
        appointmentId: item.appointment._id,
        heartRate: draft.hr ? Number(draft.hr) : undefined,
        respiratoryRate: draft.rr ? Number(draft.rr) : undefined,
        spo2: draft.spo2 ? Number(draft.spo2) : undefined,
        temperature: draft.temp ? Number(draft.temp) : undefined,
        bloodPressure: draft.bp || undefined,
        weight: draft.weight ? Number(draft.weight) : undefined,
        height: draft.height ? Number(draft.height) : undefined,
        notes: draft.notes || undefined,
      });
      if (res.success) {
        toast.success("Vitals recorded successfully");
        setOpenId(null);
        setDraft({ hr: "", rr: "", spo2: "", temp: "", bp: "", weight: "", height: "", notes: "" });
        loadQueue();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save vitals");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 mono-label text-muted-foreground animate-pulse">Loading vitals queue...</div>;
  }

  const pending = queue.filter(q => !q.hasVitals).length;
  const recorded = queue.filter(q => q.hasVitals).length;

  const shiftStats = [
    { label: "Patients in queue", value: String(queue.length), note: "today's appointments" },
    { label: "Vitals recorded", value: String(recorded), note: `${pending} pending` },
  ];

  return (
    <section>
      <PanelHeader
        index="01 / rounds"
        title="Vitals round"
        note="Observation rounds ordered by appointment time. Record vitals for each patient before they see the doctor."
        actions={
          <>
            <ActionButton onClick={loadQueue}>Refresh</ActionButton>
            <ActionButton tone="solid">{recorded} / {queue.length} recorded</ActionButton>
          </>
        }
      />

      <StatGrid stats={shiftStats} />

      <div className="hairline-t grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {queue.length === 0 && (
          <div className="bg-background p-8 text-center text-muted-foreground mono-label lg:col-span-2">
            No patients in queue today.
          </div>
        )}

        {queue.map((item) => {
          const apt = item.appointment;
          const open = openId === apt._id;
          const patientName = apt.patient?.name || "Unknown Patient";
          const doctorName = apt.doctor?.name || "Unknown Doctor";

          return (
            <div key={apt._id} className="bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">
                    {apt.timeSlot} · {apt.department}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold">{patientName}</p>
                  <p className="mono-label text-muted-foreground">
                    Dr. {doctorName} · {apt.reason || "OPD Consultation"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Pill tone={item.hasVitals ? "ok" : "warn"}>
                    {item.hasVitals ? "Vitals recorded ✓" : "Pending"}
                  </Pill>
                </div>
              </div>

              {/* Show existing vitals if recorded */}
              {item.hasVitals && item.vitals && (
                <div className="mono-label mt-4 grid grid-cols-3 gap-px sm:grid-cols-5" style={{ background: "var(--hairline)" }}>
                  {[
                    ["HR", item.vitals.heartRate ? `${item.vitals.heartRate} bpm` : "—"],
                    ["RR", item.vitals.respiratoryRate ? `${item.vitals.respiratoryRate}` : "—"],
                    ["SpO2", item.vitals.spo2 ? `${item.vitals.spo2}%` : "—"],
                    ["Temp", item.vitals.temperature ? `${item.vitals.temperature}°C` : "—"],
                    ["BP", item.vitals.bloodPressure || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-background px-2 py-3 text-center">
                      <p className="text-muted-foreground">{k}</p>
                      <p className="text-foreground mt-1 font-mono text-base">{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recording form */}
              {open && !item.hasVitals && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="hairline grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                    {([
                      ["hr", "Heart Rate (bpm)"],
                      ["rr", "Resp. Rate"],
                      ["spo2", "SpO2 (%)"],
                      ["temp", "Temp (°C)"],
                      ["bp", "BP (e.g. 120/80)"],
                      ["weight", "Weight (kg)"],
                      ["height", "Height (cm)"],
                    ] as const).map(([k, label]) => (
                      <label key={k} className="mono-label text-muted-foreground">
                        {label}
                        <input
                          value={draft[k]}
                          onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                          placeholder="—"
                          className="hairline text-foreground mt-1 w-full bg-transparent px-2 py-1.5 font-mono text-sm outline-none"
                        />
                      </label>
                    ))}
                    <label className="mono-label text-muted-foreground sm:col-span-4 col-span-2">
                      Notes
                      <textarea
                        value={draft.notes}
                        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                        placeholder="Additional observations..."
                        rows={2}
                        className="hairline text-foreground mt-1 w-full bg-transparent px-2 py-1.5 font-mono text-sm outline-none resize-none"
                      />
                    </label>
                  </div>
                </motion.div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {!item.hasVitals && (
                  <>
                    <ActionButton onClick={() => setOpenId(open ? null : apt._id)}>
                      {open ? "Close" : "Record obs"}
                    </ActionButton>
                    {open && (
                      <ActionButton
                        tone="solid"
                        onClick={() => handleSaveVitals(item)}
                      >
                        {saving ? "Saving..." : "Save vitals"}
                      </ActionButton>
                    )}
                  </>
                )}
                {item.hasVitals && (
                  <span className="mono-label text-muted-foreground flex items-center gap-1">
                    <Check className="size-3" /> Completed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 02 handover ---------- */

export function HandoverPanel() {
  return (
    <section>
      <PanelHeader
        index="02 / handover"
        title="Shift handover"
        note="SBAR-structured shift handover notes. Document key observations and pending tasks for the incoming shift."
      />
      <div className="bg-background p-8">
        <p className="mono-label text-muted-foreground">
          Shift handover notes will appear here. This panel is reserved for future structured SBAR documentation.
        </p>
      </div>
    </section>
  );
}
