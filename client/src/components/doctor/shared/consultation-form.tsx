"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { toast } from "sonner";
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import { AppointmentRecord } from "@/lib/api/appointment";
import { AnatomySelector } from "./anatomy-selector";
import { TelemedicineWorkbench } from "../../video-call/telemedicine-workbench";
import { Video } from "lucide-react";
import { formatTimeRange } from "@/lib/time-format";

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
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    chiefComplaint?: string;
    diagnosis?: string;
  }>({});

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
    if (
      !newMed.name ||
      !newMed.dosage ||
      !newMed.frequency ||
      !newMed.duration
    ) {
      toast.error("Please fill required medicine fields");
      return;
    }
    setMedicines([...medicines, newMed]);
    setNewMed({
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
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
    const hasMedicineDraft = [
      newMed.name,
      newMed.dosage,
      newMed.frequency,
      newMed.duration,
    ].some((value) => value.trim().length > 0);
    const medicineDraftComplete = [
      newMed.name,
      newMed.dosage,
      newMed.frequency,
      newMed.duration,
    ].every((value) => value.trim().length > 0);
    if (hasMedicineDraft && !medicineDraftComplete) {
      toast.error("Finish or clear the medicine details before completing.");
      document.getElementById("new-med-name")?.focus();
      return;
    }
    const prescriptionMedicines = hasMedicineDraft
      ? [...medicines, { ...newMed }]
      : medicines;

    const errors = {
      ...(chiefComplaint.trim().length < 3
        ? { chiefComplaint: "Add the patient's chief complaint." }
        : {}),
      ...(diagnosis.trim().length < 2
        ? { diagnosis: "Enter a diagnosis before completing this visit." }
        : {}),
    };
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(
        "Add the chief complaint and diagnosis to complete this visit.",
      );
      document
        .getElementById(
          errors.chiefComplaint ? "chief-complaint" : "consultation-diagnosis",
        )
        ?.focus();
      return;
    }

    try {
      setSaving(true);
      const patId = appointment
        ? typeof appointment.patient === "object"
          ? appointment.patient._id
          : appointment.patient
        : patient?._id;

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
        medicines: prescriptionMedicines,
        diagnosticOrders,
        status: "COMPLETED",
      });
      if (res.status === "success") {
        toast.success("Consultation saved and completed");
        onComplete();
      }
    } catch {
      toast.error("Failed to save consultation");
    } finally {
      setSaving(false);
    }
  };

  const displayPat = appointment
    ? typeof appointment.patient === "object"
      ? appointment.patient
      : null
    : patient;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-100 flex h-dvh w-full flex-col overflow-y-auto bg-background"
    >
      <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border/40 bg-background/95 px-3 py-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-foreground text-lg">
            Consultation: {displayPat?.name || "Unknown"}
          </h2>
          {appointment ? (
            <p className="mono-label text-muted-foreground text-xs">
              {appointment.date} |{" "}
              {formatTimeRange(appointment.timeSlot, appointment.slotEndTime)} |{" "}
              {appointment.department}
              {appointment.queueNumber
                ? ` · Queue #${String(appointment.queueNumber).padStart(2, "0")}`
                : ""}
            </p>
          ) : (
            <p className="mono-label text-muted-foreground text-xs">
              Ad-Hoc Consultation • Shift Board
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {appointment?.type === "TELECONSULT" && !isVideoCallActive && (
            <ActionButton
              onClick={() => setIsVideoCallActive(true)}
              className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-indigo-500/30 flex items-center gap-2"
            >
              <Video className="size-4" /> Start Video Call
            </ActionButton>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-36 sm:space-y-7 sm:p-6 sm:pb-36 lg:p-8">
        {/* Video Call Workspace */}
        {isVideoCallActive && appointment && (
          <div className="mb-8 w-full">
            <TelemedicineWorkbench
              appointmentId={appointment._id}
              isDoctor={true}
              onEndCall={() => setIsVideoCallActive(false)}
            />
          </div>
        )}

        {/* Vitals / Reason */}
        {appointment?.reason && (
          <div className="bg-muted/30 border border-border/60 rounded-xl p-4 shadow-sm">
            <p className="mono-label text-muted-foreground mb-1 uppercase text-[10px] tracking-wider font-bold">
              Reason for Visit
            </p>
            <p className="font-medium text-foreground">{appointment.reason}</p>
          </div>
        )}

        {/* Clinical Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label
                htmlFor="chief-complaint"
                className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3"
              >
                Chief Complaint <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="w-full xl:w-2/5 min-w-45 flex items-center justify-center">
                  <AnatomySelector
                    onSelect={(part) =>
                      setChiefComplaint((prev) =>
                        prev ? `${prev}, [${part}]` : `[${part}]`,
                      )
                    }
                  />
                </div>
                <textarea
                  id="chief-complaint"
                  aria-label="Chief Complaint"
                  title="Chief Complaint"
                  value={chiefComplaint}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(validationErrors.chiefComplaint)}
                  aria-describedby={
                    validationErrors.chiefComplaint
                      ? "chief-complaint-error"
                      : undefined
                  }
                  onChange={(e) => {
                    setChiefComplaint(e.target.value);
                    if (validationErrors.chiefComplaint)
                      setValidationErrors((current) => ({
                        ...current,
                        chiefComplaint: undefined,
                      }));
                  }}
                  className={`w-full resize-none rounded-xl border bg-background p-3 min-h-32 outline-none transition-colors focus:border-primary/50 xl:w-3/5 ${validationErrors.chiefComplaint ? "border-destructive" : "border-border/60"}`}
                  placeholder="Patient presents with... (Select anatomy areas to auto-tag)"
                />
              </div>
              {validationErrors.chiefComplaint && (
                <p
                  id="chief-complaint-error"
                  className="mt-2 text-sm text-destructive"
                  role="alert"
                >
                  {validationErrors.chiefComplaint}
                </p>
              )}
            </div>
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label
                htmlFor="consultation-diagnosis"
                className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3"
              >
                Diagnosis <span className="text-destructive">*</span>
              </label>
              <input
                id="consultation-diagnosis"
                aria-label="Diagnosis"
                title="Diagnosis"
                type="text"
                required
                aria-required="true"
                aria-invalid={Boolean(validationErrors.diagnosis)}
                aria-describedby={
                  validationErrors.diagnosis ? "diagnosis-error" : undefined
                }
                value={diagnosis}
                onChange={(e) => {
                  setDiagnosis(e.target.value);
                  if (validationErrors.diagnosis)
                    setValidationErrors((current) => ({
                      ...current,
                      diagnosis: undefined,
                    }));
                }}
                className={`w-full rounded-xl border bg-background p-3 outline-none transition-colors focus:border-primary/50 ${validationErrors.diagnosis ? "border-destructive" : "border-border/60"}`}
                placeholder="e.g. Acute Viral Pharyngitis"
              />
              {validationErrors.diagnosis && (
                <p
                  id="diagnosis-error"
                  className="mt-2 text-sm text-destructive"
                  role="alert"
                >
                  {validationErrors.diagnosis}
                </p>
              )}
            </div>
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label
                htmlFor="consultation-advice"
                className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3"
              >
                Advice & Lifestyle
              </label>
              <textarea
                id="consultation-advice"
                aria-label="Advice & Lifestyle"
                title="Advice & Lifestyle"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl p-3 min-h-25 outline-none focus:border-primary/50 transition-colors"
                placeholder="Dietary changes, rest..."
              />
            </div>
            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
              <label
                htmlFor="consultation-followup"
                className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3"
              >
                Next Follow-Up Date
              </label>
              <input
                id="consultation-followup"
                aria-label="Next Follow-Up Date"
                title="Next Follow-Up Date"
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
            <h3 className="font-display font-bold text-xl border-b border-border/40 pb-3">
              Rx: Prescription
            </h3>

            {/* Added Medicines */}
            <div className="space-y-3 mb-4">
              {medicines.length === 0 ? (
                <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-dashed border-border/60 text-center">
                  No medicines added.
                </p>
              ) : (
                medicines.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between bg-card p-4 border border-border/60 shadow-sm rounded-xl"
                  >
                    <div>
                      <p className="font-bold text-base text-foreground">
                        {m.name}{" "}
                        <span className="text-muted-foreground text-sm font-normal">
                          — {m.dosage}
                        </span>
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                        {m.frequency} x {m.duration}
                      </p>
                      {m.instructions && (
                        <p className="text-xs text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-1 rounded inline-block">
                          {m.instructions}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedicine(i)}
                      aria-label={`Remove ${m.name} from prescription`}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Medicine */}
            <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm">
              <label
                htmlFor="new-med-name"
                className="text-xs uppercase tracking-wider font-bold text-primary mb-4 block"
              >
                Add Medicine (Free Text / Search)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  id="new-med-name"
                  aria-label="Drug Name"
                  title="Drug Name"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="Drug Name (e.g. Paracetamol)"
                  value={newMed.name}
                  onChange={(e) =>
                    setNewMed({ ...newMed, name: e.target.value })
                  }
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
                  aria-label="Dosage"
                  title="Dosage"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="Dosage (e.g. 500mg)"
                  value={newMed.dosage}
                  onChange={(e) =>
                    setNewMed({ ...newMed, dosage: e.target.value })
                  }
                  className="bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50"
                />
                <input
                  aria-label="Frequency"
                  title="Frequency"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="Freq (e.g. 1-0-1)"
                  value={newMed.frequency}
                  onChange={(e) =>
                    setNewMed({ ...newMed, frequency: e.target.value })
                  }
                  className="bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50"
                />
                <input
                  aria-label="Duration"
                  title="Duration"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="Duration (e.g. 5 days)"
                  value={newMed.duration}
                  onChange={(e) =>
                    setNewMed({ ...newMed, duration: e.target.value })
                  }
                  className="bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <input
                aria-label="Instructions"
                title="Instructions"
                type="text"
                placeholder="Instructions (e.g. After food) [Optional]"
                value={newMed.instructions}
                onChange={(e) =>
                  setNewMed({ ...newMed, instructions: e.target.value })
                }
                className="w-full bg-background border border-border/60 rounded-lg p-2.5 text-sm outline-none focus:border-primary/50 mb-4"
              />
              <button
                type="button"
                onClick={addMedicine}
                className="w-full bg-primary/10 text-primary font-bold py-3 rounded-xl text-sm hover:bg-primary/20 transition-colors"
              >
                + Add to Prescription
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Orders */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 mt-8 shadow-sm">
          <h3 className="font-display font-bold text-xl border-b border-border/40 pb-3 mb-5">
            Diagnostic Orders (Labs / Scans)
          </h3>

          {/* Added Orders */}
          <div className="space-y-3 mb-5">
            {diagnosticOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-dashed border-border/60 text-center">
                No diagnostics ordered.
              </p>
            ) : (
              diagnosticOrders.map((o, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between bg-background p-4 border border-border/60 shadow-sm rounded-xl"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold bg-muted px-2 py-1 rounded-md mr-3">
                      {o.testType}
                    </span>
                    <span className="font-bold text-base">{o.testName}</span>
                    {o.clinicalNotes && (
                      <p className="text-sm text-muted-foreground mt-2 border-l-2 border-primary/30 pl-2">
                        {o.clinicalNotes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOrder(i)}
                    aria-label={`Remove ${o.testName} from diagnostic orders`}
                    className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
                  >
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
                id="diagnostic-order-type"
                aria-label="Test Type"
                title="Test Type"
                value={newOrder.testType}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, testType: e.target.value as any })
                }
                className="bg-background border border-border/60 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
              >
                <option value="PATHOLOGY">Pathology (Lab Test)</option>
                <option value="RADIOLOGY">Radiology (Scan/Imaging)</option>
              </select>
              <input
                id="diagnostic-order-name"
                aria-label="Test Name"
                title="Test Name"
                type="text"
                placeholder="Test Name (e.g. CBC, MRI Brain)"
                value={newOrder.testName}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, testName: e.target.value })
                }
                className="sm:col-span-2 bg-background border border-border/60 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <input
              id="diagnostic-order-notes"
              aria-label="Clinical Notes or Indications"
              title="Clinical Notes or Indications"
              type="text"
              placeholder="Clinical Notes / Indications [Optional]"
              value={newOrder.clinicalNotes}
              onChange={(e) =>
                setNewOrder({ ...newOrder, clinicalNotes: e.target.value })
              }
              className="w-full bg-background border border-border/60 rounded-xl p-3 text-sm outline-none focus:border-primary/50 mb-4"
            />
            <button
              type="button"
              onClick={addOrder}
              className="w-full bg-indigo-500/10 text-indigo-500 font-bold py-3 rounded-xl text-sm hover:bg-indigo-500/20 transition-colors"
            >
              + Add Diagnostic Order
            </button>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Chief complaint and diagnosis are required to complete the visit.
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ActionButton onClick={onBack} disabled={saving}>
              Cancel
            </ActionButton>
            <ActionButton
              tone="solid"
              onClick={handleSave}
              disabled={saving}
              className="whitespace-nowrap"
            >
              {saving ? "Saving…" : "Save & Complete"}
            </ActionButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
