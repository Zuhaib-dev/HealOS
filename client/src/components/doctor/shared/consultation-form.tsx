"use client";

/* Hallmark · component: consult-desk · genre: modern-minimal · theme: Emerald Prestige
 * states: default · hover · focus · active · disabled · loading · error · success
 */

import { useState } from "react";
import { X, Video } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { toast } from "sonner";
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import { AppointmentRecord } from "@/lib/api/appointment";
import { AnatomySelector } from "./anatomy-selector";
import { TelemedicineWorkbench } from "../../video-call/telemedicine-workbench";
import { formatTimeRange } from "@/lib/time-format";

const field =
  "w-full border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50";

const FREQ = ["OD", "BD", "TDS", "1-0-1", "1-0-0", "0-0-1", "SOS"];
const DURATION = ["3 days", "5 days", "7 days", "14 days"];
const INSTRUCT = ["After food", "Before food", "With water"];

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

  const [newMed, setNewMed] = useState<IMedicine>({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });

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
      toast.error("Fill name, dose, frequency, and duration");
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
      toast.error("Enter a test name");
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
      toast.error("Finish or clear the medicine row before completing.");
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
      toast.error("Chief complaint and diagnosis are required.");
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
        toast.success("Visit completed");
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

  const chip = (active: boolean) =>
    `px-2.5 py-1 text-[11px] font-semibold focus-visible:ring-2 focus-visible:ring-primary/40 ${
      active
        ? "bg-foreground text-background"
        : "border border-border/60 text-muted-foreground hover:bg-muted/50"
    }`;

  return (
    <div className="fixed inset-0 z-100 flex h-dvh w-full flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 bg-background/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
            {displayPat?.name || "Patient"}
          </h2>
          {appointment ? (
            <p className="mono-label mt-0.5 text-[10px] text-muted-foreground">
              {appointment.queueNumber
                ? `#${String(appointment.queueNumber).padStart(2, "0")} · `
                : ""}
              {formatTimeRange(appointment.timeSlot, appointment.slotEndTime)} ·{" "}
              {appointment.department}
            </p>
          ) : (
            <p className="mono-label mt-0.5 text-[10px] text-muted-foreground">
              Walk-in note · no booked slot
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {appointment?.type === "TELECONSULT" && !isVideoCallActive ? (
            <ActionButton
              onClick={() => setIsVideoCallActive(true)}
              className="flex items-center gap-2"
            >
              <Video className="size-4" /> Start video
            </ActionButton>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            aria-label="Close consult"
            className="flex size-10 items-center justify-center border border-border/60 hover:bg-muted disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-28">
        {isVideoCallActive && appointment ? (
          <div className="border-b border-border/60 p-4 sm:p-6">
            <TelemedicineWorkbench
              appointmentId={appointment._id}
              isDoctor={true}
              onEndCall={() => setIsVideoCallActive(false)}
            />
          </div>
        ) : null}

        {appointment?.reason ? (
          <p className="border-b border-border/60 px-4 py-3 text-sm sm:px-6">
            <span className="mono-label mr-2 text-[10px] text-muted-foreground">
              Reason
            </span>
            {appointment.reason}
          </p>
        ) : null}

        <div className="grid lg:grid-cols-2 lg:min-h-full">
          <div className="min-w-0 border-b border-border/60 lg:border-r lg:border-b-0">
            <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,9rem)_1fr]">
              <AnatomySelector
                onSelect={(part) =>
                  setChiefComplaint((prev) =>
                    prev ? `${prev}, [${part}]` : `[${part}]`,
                  )
                }
              />
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="chief-complaint"
                    className="mono-label text-[10px] text-muted-foreground"
                  >
                    Chief complaint
                  </label>
                  <textarea
                    id="chief-complaint"
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
                    className={`${field} mt-2 min-h-28 resize-y ${validationErrors.chiefComplaint ? "border-destructive" : ""}`}
                    placeholder="What brought them in"
                  />
                  {validationErrors.chiefComplaint ? (
                    <p
                      id="chief-complaint-error"
                      className="mt-2 text-sm text-destructive"
                      role="alert"
                    >
                      {validationErrors.chiefComplaint}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="consultation-diagnosis"
                    className="mono-label text-[10px] text-muted-foreground"
                  >
                    Diagnosis
                  </label>
                  <input
                    id="consultation-diagnosis"
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
                    className={`${field} mt-2 ${validationErrors.diagnosis ? "border-destructive" : ""}`}
                    placeholder="Working diagnosis"
                  />
                  {validationErrors.diagnosis ? (
                    <p
                      id="diagnosis-error"
                      className="mt-2 text-sm text-destructive"
                      role="alert"
                    >
                      {validationErrors.diagnosis}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="consultation-advice"
                    className="mono-label text-[10px] text-muted-foreground"
                  >
                    Advice
                  </label>
                  <textarea
                    id="consultation-advice"
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                    className={`${field} mt-2 min-h-20 resize-y`}
                    placeholder="Rest, diet, warning signs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="consultation-followup"
                    className="mono-label text-[10px] text-muted-foreground"
                  >
                    Follow-up date
                  </label>
                  <input
                    id="consultation-followup"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={`${field} mt-2`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="border-b border-border/40 px-4 py-3 sm:px-6">
              <h3 className="font-display text-sm font-bold">Prescription</h3>
            </div>
            {medicines.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground sm:px-6">
                No medicines yet. Add a row below.
              </p>
            ) : (
              medicines.map((m, i) => (
                <div
                  key={`${m.name}-${i}`}
                  className="flex items-start justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {m.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        {m.dosage}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.frequency} · {m.duration}
                      {m.instructions ? ` · ${m.instructions}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMedicine(i)}
                    aria-label={`Remove ${m.name}`}
                    className="flex size-8 shrink-0 items-center justify-center text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))
            )}

            <div className="space-y-3 p-4 sm:p-6">
              <label
                htmlFor="new-med-name"
                className="mono-label text-[10px] text-muted-foreground"
              >
                Add medicine
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  id="new-med-name"
                  type="text"
                  placeholder="Name"
                  value={newMed.name}
                  onChange={(e) =>
                    setNewMed({ ...newMed, name: e.target.value })
                  }
                  className={field}
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
                  placeholder="Dose"
                  value={newMed.dosage}
                  onChange={(e) =>
                    setNewMed({ ...newMed, dosage: e.target.value })
                  }
                  className={field}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">
                  Frequency
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {FREQ.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setNewMed({ ...newMed, frequency: f })}
                      className={chip(newMed.frequency === f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or type frequency"
                  value={newMed.frequency}
                  onChange={(e) =>
                    setNewMed({ ...newMed, frequency: e.target.value })
                  }
                  className={`${field} mt-2`}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">
                  Duration
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewMed({ ...newMed, duration: d })}
                      className={chip(newMed.duration === d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or type duration"
                  value={newMed.duration}
                  onChange={(e) =>
                    setNewMed({ ...newMed, duration: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMedicine();
                    }
                  }}
                  className={`${field} mt-2`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUCT.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewMed({ ...newMed, instructions: d })}
                    className={chip(newMed.instructions === d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Instructions (optional)"
                value={newMed.instructions}
                onChange={(e) =>
                  setNewMed({ ...newMed, instructions: e.target.value })
                }
                className={field}
              />
              <button
                type="button"
                onClick={addMedicine}
                className="w-full border border-border/60 py-2.5 text-sm font-semibold hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Add to prescription
              </button>
            </div>

            <div className="border-t border-border/60">
              <div className="border-b border-border/40 px-4 py-3 sm:px-6">
                <h3 className="font-display text-sm font-bold">
                  Lab / imaging
                </h3>
              </div>
              {diagnosticOrders.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground sm:px-6">
                  No tests ordered.
                </p>
              ) : (
                diagnosticOrders.map((o, i) => (
                  <div
                    key={`${o.testName}-${i}`}
                    className="flex items-start justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-semibold">{o.testName}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.testType}
                        {o.clinicalNotes ? ` · ${o.clinicalNotes}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOrder(i)}
                      aria-label={`Remove ${o.testName}`}
                      className="flex size-8 items-center justify-center text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              )}
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:p-6">
                <select
                  id="diagnostic-order-type"
                  value={newOrder.testType}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      testType: e.target.value as "PATHOLOGY" | "RADIOLOGY",
                    })
                  }
                  className={field}
                >
                  <option value="PATHOLOGY">Pathology</option>
                  <option value="RADIOLOGY">Radiology</option>
                </select>
                <input
                  id="diagnostic-order-name"
                  type="text"
                  placeholder="Test name"
                  value={newOrder.testName}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, testName: e.target.value })
                  }
                  className={`sm:col-span-2 ${field}`}
                />
                <input
                  id="diagnostic-order-notes"
                  type="text"
                  placeholder="Indication (optional)"
                  value={newOrder.clinicalNotes}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      clinicalNotes: e.target.value,
                    })
                  }
                  className={`sm:col-span-3 ${field}`}
                />
                <button
                  type="button"
                  onClick={addOrder}
                  className="border border-border/60 py-2.5 text-sm font-semibold hover:bg-muted/50 sm:col-span-3 focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Add test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Complaint and diagnosis are required.
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
              {saving ? "Saving…" : "Complete visit"}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
