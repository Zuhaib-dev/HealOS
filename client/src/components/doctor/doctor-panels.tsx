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

/* ---------- 01 · Shift board ---------- */

export function ShiftPanel() {
  const { user } = useAuthStore();
  const critical = rounds.filter((r) => r.acuity === "critical");
  const tasks = rounds.flatMap((r) => r.tasks.map((t) => ({ t, who: r.name, bed: r.bed })));

  return (
    <div>
      <PanelHeader
        index="01 / shift"
        title={`Shift Board — Dr. ${user?.name || "Clinician"}`}
        note={`Duty Designation: ${user?.role || "DOCTOR"} · Email: ${user?.email || "N/A"}`}
        actions={
          <>
            <ActionButton>Print round sheet</ActionButton>
            <ActionButton tone="solid">Start ward round</ActionButton>
          </>
        }
      />

      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        {shiftStats.map((s) => (
          <div key={s.label} className="hairline-l px-5 py-5">
            <p className="mono-label text-muted-foreground">{s.label}</p>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="mono-label text-muted-foreground mt-2">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="hairline-b grid lg:grid-cols-2">
        <div className="hairline-l px-5 py-6">
          <p className="mono-label text-destructive flex items-center gap-2">
            <TriangleAlert className="size-3.5" /> Deteriorating — see first
          </p>
          <div className="mt-4 space-y-3">
            {critical.map((p) => (
              <motion.div
                key={p.mrn}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="hairline flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="mono-label text-muted-foreground">
                    {p.bed} · {p.dx}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Vitals series={p.vitals} />
                  <span className="mono-label text-destructive whitespace-nowrap">
                    NEWS2 {p.news2}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="hairline-l px-5 py-6">
          <p className="mono-label text-muted-foreground">Open tasks</p>
          <div className="mt-4">
            {tasks.map((t) => (
              <label
                key={t.t}
                className="hairline-b flex cursor-pointer items-center gap-3 py-3 last:border-b-0"
              >
                <input type="checkbox" className="accent-[var(--color-accent)]" />
                <span className="text-sm">{t.t}</span>
                <span className="mono-label text-muted-foreground ml-auto">{t.bed}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 02 · My patients ---------- */

export function RoundsPanel() {
  const [seen, setSeen] = useState<string[]>(rounds.filter((r) => r.seen).map((r) => r.mrn));

  return (
    <div>
      <PanelHeader
        index="02 / caseload"
        title="My patients"
        note="Your list by bed, with NEWS2 trend, working diagnosis and what remains before handover."
        actions={<ActionButton tone="solid">Add to list</ActionButton>}
      />
      <div className="grid xl:grid-cols-2">
        {rounds.map((p) => {
          const done = seen.includes(p.mrn);
          return (
            <motion.article
              key={p.mrn}
              layout
              className="hairline-l hairline-b px-5 py-5"
              animate={{ opacity: done ? 0.6 : 1 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-mono text-lg font-bold">{p.name}</h3>
                    {acuityPill(p.acuity)}
                  </div>
                  <p className="mono-label text-muted-foreground mt-1">
                    {p.mrn} · {p.age}
                    {p.sex} · {p.bed} · LOS {p.los}
                  </p>
                </div>
                <Vitals series={p.vitals} />
              </div>

              <p className="mt-4 text-sm">{p.dx}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`mono-label ${p.news2 >= 5 ? "text-destructive" : "text-brass"}`}>
                  NEWS2 {p.news2}
                </span>
                {p.tasks.map((t) => (
                  <span key={t} className="mono-label bg-foreground/[0.05] px-2 py-1">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSeen((s) => (done ? s.filter((m) => m !== p.mrn) : [...s, p.mrn]))
                  }
                  className={`mono-label flex items-center gap-1.5 px-3 py-2 ${
                    done ? "bg-accent/12 text-brass" : "hairline"
                  }`}
                >
                  <Check className="size-3" /> {done ? "reviewed" : "mark reviewed"}
                </button>
                <button type="button" className="mono-label hairline flex items-center gap-1.5 px-3 py-2">
                  <PenLine className="size-3" /> write note
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 03 · Clinic list ---------- */

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
        <table className="w-full min-w-[720px]">
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
        <div className="bg-foreground/[0.02] border border-[var(--hairline)] rounded p-4">
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
                className="w-full bg-transparent border border-[var(--hairline)] p-3 min-h-[100px] outline-none focus:border-accent"
                placeholder="Patient presents with..."
              />
            </div>
            <div>
              <label className="mono-label text-muted-foreground block mb-2">Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full bg-transparent border border-[var(--hairline)] p-3 outline-none focus:border-accent"
                placeholder="e.g. Acute Viral Pharyngitis"
              />
            </div>
            <div>
              <label className="mono-label text-muted-foreground block mb-2">Advice & Lifestyle</label>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full bg-transparent border border-[var(--hairline)] p-3 min-h-[100px] outline-none focus:border-accent"
                placeholder="Dietary changes, rest..."
              />
            </div>
          </div>

          {/* Prescription Writer */}
          <div className="space-y-4">
            <h3 className="font-mono font-bold text-lg border-b border-[var(--hairline)] pb-2">Rx: Prescription</h3>
            
            {/* Added Medicines */}
            <div className="space-y-2 mb-4">
              {medicines.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No medicines added.</p>
              ) : (
                medicines.map((m, i) => (
                  <div key={i} className="flex items-start justify-between bg-foreground/[0.03] p-3 border border-[var(--hairline)] rounded">
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
            <div className="border border-[var(--hairline)] p-4 rounded bg-background">
              <p className="mono-label text-xs mb-3 text-brass">Add Medicine (Free Text / Search)</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Drug Name (e.g. Paracetamol)"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent"
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
                  className="bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Frequency (e.g. 1-0-1)"
                  value={newMed.frequency}
                  onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                  className="bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 5 days)"
                  value={newMed.duration}
                  onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                  className="bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <input
                type="text"
                placeholder="Instructions (e.g. After food) [Optional]"
                value={newMed.instructions}
                onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                className="w-full bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent mb-3"
              />
              <button onClick={addMedicine} className="w-full bg-accent/10 text-accent font-medium py-2 text-sm hover:bg-accent/20 transition-colors">
                + Add to Prescription
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Orders */}
        <div className="bg-foreground/[0.02] border border-[var(--hairline)] rounded p-6 mt-6">
          <h3 className="font-mono font-bold text-lg border-b border-[var(--hairline)] pb-2 mb-4">Diagnostic Orders (Labs / Scans)</h3>
          
          {/* Added Orders */}
          <div className="space-y-2 mb-4">
            {diagnosticOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No diagnostics ordered.</p>
            ) : (
              diagnosticOrders.map((o, i) => (
                <div key={i} className="flex items-start justify-between bg-background p-3 border border-[var(--hairline)] rounded">
                  <div>
                    <span className="mono-label text-xs bg-foreground/[0.06] px-1.5 py-0.5 rounded mr-2">{o.testType}</span>
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
          <div className="border border-[var(--hairline)] p-4 rounded bg-background">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
               <select
                 value={newOrder.testType}
                 onChange={(e) => setNewOrder({ ...newOrder, testType: e.target.value as any })}
                 className="bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent"
               >
                 <option value="PATHOLOGY">Pathology (Lab Test)</option>
                 <option value="RADIOLOGY">Radiology (Scan/Imaging)</option>
               </select>
               <input
                 type="text"
                 placeholder="Test Name (e.g. CBC, MRI Brain)"
                 value={newOrder.testName}
                 onChange={(e) => setNewOrder({ ...newOrder, testName: e.target.value })}
                 className="sm:col-span-2 bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent"
               />
             </div>
             <input
               type="text"
               placeholder="Clinical Notes / Indications [Optional]"
               value={newOrder.clinicalNotes}
               onChange={(e) => setNewOrder({ ...newOrder, clinicalNotes: e.target.value })}
               className="w-full bg-transparent border border-[var(--hairline)] p-2 text-sm outline-none focus:border-accent mb-3"
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
        <table className="w-full min-w-[820px]">
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
        <table className="w-full min-w-[760px]">
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

/* ---------- 06 · Documentation ---------- */

export function NotesPanel() {
  const [template, setTemplate] = useState(noteTemplates[0]!);
  const [body, setBody] = useState(
    "SUBJECTIVE\n\nOBJECTIVE\n  Obs: \n  Exam: \n\nASSESSMENT\n\nPLAN\n  1. ",
  );
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PanelHeader
        index="06 / documentation"
        title="Clinical notes"
        note="Structured note capture with templates, so what you write once lands in the record, the ledger and the discharge letter."
        actions={
          <ActionButton
            tone="solid"
            onClick={() => {
              setSaved(true);
              window.setTimeout(() => setSaved(false), 1800);
            }}
          >
            {saved ? "Signed & filed" : "Sign note"}
          </ActionButton>
        }
      />
      <div className="grid lg:grid-cols-[220px_1fr]">
        <div className="hairline-b border-r border-[var(--hairline)] p-4">
          <p className="mono-label text-muted-foreground">Templates</p>
          <div className="mt-3 flex flex-col gap-1">
            {noteTemplates.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTemplate(t)}
                className={`mono-label px-3 py-2 text-left ${
                  template === t
                    ? "bg-accent/12 text-brass"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 sm:p-8">
          <p className="mono-label text-muted-foreground">
            {template} · Jonas Vidal · PT-99401 · ICU-A 04
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            className="hairline mt-3 min-h-72 w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
          />
          <p className="mono-label text-muted-foreground mt-3">
            autosaved 12s ago · {body.length} chars · countersign required for ICU notes
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- 07 · Handover ---------- */

export function HandoverPanel() {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);

  return (
    <div>
      <PanelHeader
        index="07 / handover"
        title="Handover & messages"
        note="Everything the outgoing team flagged, plus what you want the next shift to know."
      />
      <div className="grid lg:grid-cols-[1fr_360px]">
        <div className="hairline-l px-5 py-6 sm:px-8">
          {handovers.map((h) => (
            <motion.div
              key={h.at}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="hairline-b py-4"
            >
              <div className="flex items-center gap-3">
                <span className="mono-label text-accent/80">{h.at}</span>
                <span className="mono-label">{h.from}</span>
                {h.priority === "high" ? <Pill tone="bad">priority</Pill> : null}
              </div>
              <p className="mt-2 text-sm">{h.text}</p>
            </motion.div>
          ))}
          {sent.map((s, i) => (
            <div key={i} className="hairline-b py-4">
              <div className="flex items-center gap-3">
                <span className="mono-label text-accent/80">now</span>
                <span className="mono-label">You</span>
              </div>
              <p className="mt-2 text-sm">{s}</p>
            </div>
          ))}
        </div>
        <div className="hairline-l px-5 py-6">
          <p className="mono-label text-muted-foreground">Add handover note</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. ICU-A 04 — repeat ABG at 12:00, escalate if lactate rising"
            className="hairline placeholder:text-muted-foreground mt-3 min-h-32 w-full resize-y bg-transparent p-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!draft.trim()) return;
              setSent((s) => [...s, draft.trim()]);
              setDraft("");
            }}
            className="mono-label bg-foreground text-background mt-3 flex items-center gap-2 px-3.5 py-2"
          >
            <Send className="size-3" /> Post to handover
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 08 · Rota ---------- */

export function RotaPanel() {
  return (
    <div>
      <PanelHeader
        index="08 / rota"
        title="My rota"
        note="This week's shifts, on-call cover and where you are expected."
        actions={<ActionButton>Request swap</ActionButton>}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        {onCall.map((d) => {
          const tone =
            d.shift === "Night"
              ? "bg-foreground/[0.06]"
              : d.shift === "On-call"
                ? "bg-destructive/10"
                : d.shift === "Day"
                  ? "bg-accent/10"
                  : "";
          return (
            <div key={d.day} className={`hairline-l hairline-b px-5 py-6 ${tone}`}>
              <p className="mono-label text-muted-foreground">{d.day}</p>
              <p className="mt-3 font-mono text-lg font-bold">{d.shift}</p>
              <p className="mono-label text-muted-foreground mt-2">{d.unit}</p>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-6 sm:px-8">
        <p className="mono-label text-muted-foreground">
          58h rostered · 2 nights · compliant with rest requirements
        </p>
      </div>
    </div>
  );
}
