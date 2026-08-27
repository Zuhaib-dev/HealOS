"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { toast } from "sonner";
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import { AppointmentRecord } from "@/lib/api/appointment";
import { AnatomySelector } from "./anatomy-selector";

export function ConsultationForm({
  appointment,
  patient,
  onBack,
  onComplete,
}: {
  appointment?: AppointmentRecord;
  patient?: any;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
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
      const patId = appointment 
        ? (typeof appointment.patient === "object" ? appointment.patient._id : appointment.patient)
        : (patient?._id);

      if (!patId) {
        toast.error("Cannot resolve patient ID");
        return;
      }

      const res = await saveConsultationApi({
        patientId: patId as string,
        appointmentId: appointment?._id,
        chiefComplaint,
        diagnosis,
        advice,
        followUpDate,
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

  const displayPat = appointment 
    ? (typeof appointment.patient === "object" ? appointment.patient : null)
    : patient;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 bg-background z-100 flex flex-col overflow-y-auto w-full h-full"
    >
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-semibold text-foreground text-lg">Consultation: {displayPat?.name || "Unknown"}</h2>
          {appointment ? (
            <p className="mono-label text-muted-foreground text-xs">{appointment.date} | {appointment.timeSlot} | {appointment.department}</p>
          ) : (
            <p className="mono-label text-muted-foreground text-xs">Ad-Hoc Consultation • Shift Board</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ActionButton onClick={onBack}>Cancel</ActionButton>
          <ActionButton tone="solid" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save & Complete"}
          </ActionButton>
        </div>
      </div>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-8 pb-32">
        
        {/* Vitals / Reason */}
        {appointment?.reason && (
          <div className="bg-muted/30 border border-border/60 rounded-xl p-4 shadow-sm">
            <p className="mono-label text-muted-foreground mb-1 uppercase text-[10px] tracking-wider font-bold">Reason for Visit</p>
            <p className="font-medium text-foreground">{appointment.reason}</p>
          </div>
        )}

        {/* Clinical Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3">Chief Complaint</label>
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="w-full xl:w-2/5 min-w-45 flex items-center justify-center">
                  <AnatomySelector onSelect={(part) => setChiefComplaint(prev => prev ? `${prev}, [${part}]` : `[${part}]`)} />
                </div>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full xl:w-3/5 bg-background border border-border/60 rounded-xl p-3 min-h-32 outline-none focus:border-primary/50 transition-colors resize-none"
                  placeholder="Patient presents with... (Select anatomy areas to auto-tag)"
                />
              </div>
            </div>
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3">Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl p-3 outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. Acute Viral Pharyngitis"
              />
            </div>
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3">Advice & Lifestyle</label>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl p-3 min-h-25 outline-none focus:border-primary/50 transition-colors"
                placeholder="Dietary changes, rest..."
              />
            </div>
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3">Next Follow-Up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-background border border-border/60 rounded-xl p-3 outline-none focus:border-primary/50 transition-colors cursor-text"
              />
            </div>
          </div>

          {/* Prescription Writer */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-xl border-b border-border/40 pb-3">Rx: Prescription</h3>
            
            {/* Added Medicines */}
            <div className="space-y-3 mb-4">
              {medicines.length === 0 ? (
                <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-dashed border-border/60 text-center">No medicines added.</p>
              ) : (
                medicines.map((m, i) => (
                  <div key={i} className="flex items-start justify-between bg-card p-4 border border-border/60 shadow-sm rounded-xl">
                    <div>
                      <p className="font-bold text-base text-foreground">{m.name} <span className="text-muted-foreground text-sm font-normal">— {m.dosage}</span></p>
                      <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{m.frequency} x {m.duration}</p>
                      {m.instructions && <p className="text-xs text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-1 rounded inline-block">{m.instructions}</p>}
                    </div>
                    <button onClick={() => removeMedicine(i)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors border border-transparent hover:border-destructive/20">
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Medicine */}
            <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm">
              <p className="text-xs uppercase tracking-wider font-bold text-primary mb-4">Add Medicine (Free Text / Search)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Drug Name (e.g. Paracetamol)"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50"
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
                  className="bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50"
                />
                <input
                  type="text"
                  placeholder="Freq (e.g. 1-0-1)"
                  value={newMed.frequency}
                  onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                  className="bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 5 days)"
                  value={newMed.duration}
                  onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                  className="bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <input
                type="text"
                placeholder="Instructions (e.g. After food) [Optional]"
                value={newMed.instructions}
                onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                className="w-full bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50 mb-4"
              />
              <button onClick={addMedicine} className="w-full bg-primary/10 text-primary font-bold py-3 rounded-xl text-sm hover:bg-primary/20 transition-colors">
                + Add to Prescription
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Orders */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 mt-8 shadow-sm">
          <h3 className="font-display font-bold text-xl border-b border-border/40 pb-3 mb-5">Diagnostic Orders (Labs / Scans)</h3>
          
          {/* Added Orders */}
          <div className="space-y-3 mb-5">
            {diagnosticOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-dashed border-border/60 text-center">No diagnostics ordered.</p>
            ) : (
              diagnosticOrders.map((o, i) => (
                <div key={i} className="flex items-start justify-between bg-background p-4 border border-border/60 shadow-sm rounded-xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold bg-muted px-2 py-1 rounded-md mr-3">{o.testType}</span>
                    <span className="font-bold text-base">{o.testName}</span>
                    {o.clinicalNotes && <p className="text-sm text-muted-foreground mt-2 border-l-2 border-primary/30 pl-2">{o.clinicalNotes}</p>}
                  </div>
                  <button onClick={() => removeOrder(i)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors border border-transparent hover:border-destructive/20">
                    <X className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Order */}
          <div className="border border-border/60 p-5 rounded-2xl bg-background/50">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
               <select
                 value={newOrder.testType}
                 onChange={(e) => setNewOrder({ ...newOrder, testType: e.target.value as any })}
                 className="bg-background border border-border/60 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
               >
                 <option value="PATHOLOGY">Pathology (Lab Test)</option>
                 <option value="RADIOLOGY">Radiology (Scan/Imaging)</option>
               </select>
               <input
                 type="text"
                 placeholder="Test Name (e.g. CBC, MRI Brain)"
                 value={newOrder.testName}
                 onChange={(e) => setNewOrder({ ...newOrder, testName: e.target.value })}
                 className="sm:col-span-2 bg-background border border-border/60 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
               />
             </div>
             <input
               type="text"
               placeholder="Clinical Notes / Indications [Optional]"
               value={newOrder.clinicalNotes}
               onChange={(e) => setNewOrder({ ...newOrder, clinicalNotes: e.target.value })}
               className="w-full bg-background border border-border/60 rounded-xl p-3 text-sm outline-none focus:border-primary/50 mb-4"
             />
             <button onClick={addOrder} className="w-full bg-indigo-500/10 text-indigo-500 font-bold py-3 rounded-xl text-sm hover:bg-indigo-500/20 transition-colors">
                + Add Diagnostic Order
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
