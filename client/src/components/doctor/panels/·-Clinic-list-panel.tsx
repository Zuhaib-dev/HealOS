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
} from "./doctor-data";

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

/* ---------- 03 · Clinic list ---------- */

export function ClinicPanel() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeConsultation, setActiveConsultation] = useState<AppointmentRecord | null>(null);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetchDoctorAppointmentsApi();
      if (res.success && res.appointments) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error("Failed to load doctor appointments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleUpdateStatus = async (id: string, status: "CONFIRMED" | "COMPLETED" | "CANCELLED") => {
    let notes: string | undefined = undefined;

    if (status === "COMPLETED") {
      setActiveConsultation(appointments.find((a) => a._id === id) || null);
      return;
    }

    try {
      setBusyId(id);
      const res = await updateAppointmentStatusApi(id, status);
      if (res.success) {
        toast.success(`Appointment marked as ${status}`);
        loadAppointments();
      }
    } catch (err) {
      toast.error("Failed to update appointment status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative">
      {activeConsultation && (
        <ConsultationForm
          appointment={activeConsultation}
          onBack={() => setActiveConsultation(null)}
          onComplete={() => {
            setActiveConsultation(null);
            loadAppointments();
          }}
        />
      )}
      <PanelHeader
        index="03 / clinic"
        title="Assigned Clinic Appointments"
        note="Live patient consultation queue assigned to your clinical schedule."
        actions={<ActionButton tone="solid" onClick={() => loadAppointments()}>Refresh schedule</ActionButton>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-180">
          <thead className="hairline-b">
            <tr>
              <Th>Date & Time</Th>
              <Th>Patient</Th>
              <Th>Department</Th>
              <Th>Reason / Symptoms</Th>
              <Th>Visit Type</Th>
              <Th>Status & Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
                  Loading clinical schedule...
                </td>
              </tr>
            ) : appointments.length > 0 ? (
              appointments.map((a) => {
                const pat = typeof a.patient === "object" ? a.patient : null;
                const isBusy = busyId === a._id;

                return (
                  <tr key={a._id} className="hairline-b">
                    <Td>
                      <span className="mono-label font-bold text-brass">{a.date}</span>
                      <p className="mono-label text-muted-foreground text-xs">{a.timeSlot}</p>
                    </Td>
                    <Td>
                      <span className="font-medium text-foreground">{pat?.name || "Patient"}</span>
                      <p className="mono-label text-muted-foreground text-[11px]">{pat?.phone || pat?.email}</p>
                    </Td>
                    <Td>
                      <span className="mono-label font-semibold">{a.department}</span>
                    </Td>
                    <Td>
                      <p className="text-sm font-medium">{a.reason}</p>
                      {a.notes && (
                        <p className="text-xs text-emerald-500 font-mono mt-0.5">Note: {a.notes}</p>
                      )}
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">{a.type}</span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {a.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(a._id, "CONFIRMED")}
                              className="hairline mono-label bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2.5 py-1 text-xs rounded hover:opacity-80"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(a._id, "CANCELLED")}
                              className="hairline mono-label text-destructive px-2 py-1 text-xs rounded hover:bg-destructive/10"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {a.status === "CONFIRMED" && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(a._id, "COMPLETED")}
                              className="hairline mono-label bg-primary/15 text-primary border-primary/30 px-2.5 py-1 text-xs rounded font-bold hover:opacity-80"
                            >
                              Mark Completed
                            </button>
                          </>
                        )}

                        {a.status === "COMPLETED" && (
                          <Pill tone="ok">COMPLETED</Pill>
                        )}

                        {a.status === "CANCELLED" && (
                          <Pill tone="bad">CANCELLED</Pill>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            ) : (
              clinic.map((c) => (
                <tr key={c.time} className="hairline-b">
                  <Td>
                    <span className="mono-label">{c.time}</span>
                  </Td>
                  <Td>
                    <span className="font-medium">{c.patient}</span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{c.mrn}</span>
                  </Td>
                  <Td>{c.reason}</Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{c.kind}</span>
                  </Td>
                  <Td>
                    <Pill tone="mute">upcoming</Pill>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConsultationForm({
  appointment,
  onBack,
  onComplete,
}: {
  appointment: AppointmentRecord;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [medicines, setMedicines] = useState<IMedicine[]>([]);
  const [diagnosticOrders, setDiagnosticOrders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // New Medicine Form
  const [newMed, setNewMed] = useState<IMedicine>({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });

  // New Diagnostic Order Form
  const [newOrder, setNewOrder] = useState({
    testType: "PATHOLOGY" as "PATHOLOGY" | "RADIOLOGY",
    testName: "",
    clinicalNotes: "",
  });

  const addMedicine = () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency || !newMed.duration) {
      toast.error("Please fill required medicine fields");
      return;
    }
    setMedicines([...medicines, newMed]);
    setNewMed({ name: "", dosage: "", frequency: "", duration: "", instructions: "" });
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const addOrder = () => {
    if (!newOrder.testName) {
      toast.error("Please enter a test name");
      return;
    }
    setDiagnosticOrders([...diagnosticOrders, newOrder]);
    setNewOrder({ testType: "PATHOLOGY", testName: "", clinicalNotes: "" });
  };

  const removeOrder = (index: number) => {
    setDiagnosticOrders(diagnosticOrders.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const patId = typeof appointment.patient === "object" ? appointment.patient._id : appointment.patient;
      const res = await saveConsultationApi({
        patientId: patId as string,
        appointmentId: appointment._id,
        chiefComplaint,
        diagnosis,
        advice,
        medicines,
        diagnosticOrders,
        status: "COMPLETED",
      });
      if (res.status === "success") {
        toast.success("Consultation saved and completed");
        onComplete();
      }
    } catch (error) {
      toast.error("Failed to save consultation");
    } finally {
      setSaving(false);
    }
  };

  const pat = typeof appointment.patient === "object" ? appointment.patient : null;

  return (
    <div className="absolute inset-0 bg-background z-10 flex flex-col overflow-y-auto pb-24">
      <PanelHeader
        index="Consultation"
        title={`Patient: ${pat?.name || "Unknown"}`}
        note={`Date: ${appointment.date} | Time: ${appointment.timeSlot} | Dept: ${appointment.department}`}
        actions={
          <>
            <ActionButton onClick={onBack}>Cancel</ActionButton>
            <ActionButton tone="solid" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save & Complete"}
            </ActionButton>
          </>
        }
      />
      <div className="p-6 max-w-4xl w-full mx-auto space-y-8">
        
        {/* Vitals / Reason */}
        <div className="bg-foreground/2 border border-(--hairline) rounded p-4">
          <p className="mono-label text-muted-foreground mb-1">Reason for Visit</p>
          <p className="font-medium text-foreground">{appointment.reason}</p>
        </div>

        {/* Clinical Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="mono-label text-muted-foreground block mb-2">Chief Complaint</label>
              <textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full bg-transparent border border-(--hairline) p-3 min-h-25 outline-none focus:border-accent"
                placeholder="Patient presents with..."
              />
            </div>
            <div>
              <label className="mono-label text-muted-foreground block mb-2">Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full bg-transparent border border-(--hairline) p-3 outline-none focus:border-accent"
                placeholder="e.g. Acute Viral Pharyngitis"
              />
            </div>
            <div>
              <label className="mono-label text-muted-foreground block mb-2">Advice & Lifestyle</label>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full bg-transparent border border-(--hairline) p-3 min-h-25 outline-none focus:border-accent"
                placeholder="Dietary changes, rest..."
              />
            </div>
          </div>

          {/* Prescription Writer */}
          <div className="space-y-4">
            <h3 className="font-mono font-bold text-lg border-b border-(--hairline) pb-2">Rx: Prescription</h3>
            
            {/* Added Medicines */}
            <div className="space-y-2 mb-4">
              {medicines.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No medicines added.</p>
              ) : (
                medicines.map((m, i) => (
                  <div key={i} className="flex items-start justify-between bg-foreground/3 p-3 border border-(--hairline) rounded">
                    <div>
                      <p className="font-bold text-sm">{m.name} - <span className="text-muted-foreground">{m.dosage}</span></p>
                      <p className="text-xs text-muted-foreground">{m.frequency} x {m.duration}</p>
                      {m.instructions && <p className="text-[11px] text-emerald-500 mt-1">{m.instructions}</p>}
                    </div>
                    <button onClick={() => removeMedicine(i)} className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors">
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Medicine */}
            <div className="border border-(--hairline) p-4 rounded bg-background">
              <p className="mono-label text-xs mb-3 text-brass">Add Medicine (Free Text / Search)</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Drug Name (e.g. Paracetamol)"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent"
                  list="common-drugs"
                />
                <datalist id="common-drugs">
                  <option value="Paracetamol" />
                  <option value="Ibuprofen" />
                  <option value="Amoxicillin" />
                  <option value="Azithromycin" />
                  <option value="Cetirizine" />
                  <option value="Pantoprazole" />
                  <option value="Metformin" />
                  <option value="Amlodipine" />
                </datalist>
                
                <input
                  type="text"
                  placeholder="Dosage (e.g. 500mg)"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  className="bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Frequency (e.g. 1-0-1)"
                  value={newMed.frequency}
                  onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                  className="bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 5 days)"
                  value={newMed.duration}
                  onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                  className="bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <input
                type="text"
                placeholder="Instructions (e.g. After food) [Optional]"
                value={newMed.instructions}
                onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                className="w-full bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent mb-3"
              />
              <button onClick={addMedicine} className="w-full bg-accent/10 text-accent font-medium py-2 text-sm hover:bg-accent/20 transition-colors">
                + Add to Prescription
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Orders */}
        <div className="bg-foreground/2 border border-(--hairline) rounded p-6 mt-6">
          <h3 className="font-mono font-bold text-lg border-b border-(--hairline) pb-2 mb-4">Diagnostic Orders (Labs / Scans)</h3>
          
          {/* Added Orders */}
          <div className="space-y-2 mb-4">
            {diagnosticOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No diagnostics ordered.</p>
            ) : (
              diagnosticOrders.map((o, i) => (
                <div key={i} className="flex items-start justify-between bg-background p-3 border border-(--hairline) rounded">
                  <div>
                    <span className="mono-label text-xs bg-foreground/6 px-1.5 py-0.5 rounded mr-2">{o.testType}</span>
                    <span className="font-bold text-sm">{o.testName}</span>
                    {o.clinicalNotes && <p className="text-xs text-muted-foreground mt-1">Note: {o.clinicalNotes}</p>}
                  </div>
                  <button onClick={() => removeOrder(i)} className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors">
                    <X className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Order */}
          <div className="border border-(--hairline) p-4 rounded bg-background">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
               <select
                 value={newOrder.testType}
                 onChange={(e) => setNewOrder({ ...newOrder, testType: e.target.value as any })}
                 className="bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent"
               >
                 <option value="PATHOLOGY">Pathology (Lab Test)</option>
                 <option value="RADIOLOGY">Radiology (Scan/Imaging)</option>
               </select>
               <input
                 type="text"
                 placeholder="Test Name (e.g. CBC, MRI Brain)"
                 value={newOrder.testName}
                 onChange={(e) => setNewOrder({ ...newOrder, testName: e.target.value })}
                 className="sm:col-span-2 bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent"
               />
             </div>
             <input
               type="text"
               placeholder="Clinical Notes / Indications [Optional]"
               value={newOrder.clinicalNotes}
               onChange={(e) => setNewOrder({ ...newOrder, clinicalNotes: e.target.value })}
               className="w-full bg-transparent border border-(--hairline) p-2 text-sm outline-none focus:border-accent mb-3"
             />
             <button onClick={addOrder} className="w-full bg-primary/10 text-primary font-medium py-2 text-sm hover:bg-primary/20 transition-colors">
                + Add Diagnostic Order
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
