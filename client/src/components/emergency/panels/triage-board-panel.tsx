"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  LiveDot,
  Pill,
  StatGrid,
  Td,
  Th,
  type Tone,
} from "@/components/workspace/ui";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/use-auth-store";
import {
  fetchEmergencyStatsApi,
  fetchTriageCasesApi,
  createEmergencyCaseApi,
  updateEmergencyCaseApi,
  dischargeEmergencyCaseApi,
  fetchEmergencyCliniciansApi,
  assignEmergencyCaseApi,
  fetchEmergencyObservationsApi,
  createEmergencyObservationApi,
  type EmergencyCaseData,
  type EmergencyDisposition,
  type EsiLevel,
  type EmergencyClinicianData,
  type EmergencyObservationData,
  type CreateEmergencyObservationPayload,
} from "@/lib/api/emergency";

const esiTone = (e: EsiLevel): Tone =>
  e <= 2 ? "bad" : e === 3 ? "warn" : "mute";

export function TriageBoardPanel() {
  const [filter, setFilter] = useState<"all" | "esi12" | "waiting">("all");
  const [cases, setCases] = useState<EmergencyCaseData[]>([]);
  const [stats, setStats] = useState({
    totalInDept: 0,
    awaitingTriage: 0,
    medianTimeToClinician: "—",
    fourHourBreaches: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [assigningCase, setAssigningCase] = useState<EmergencyCaseData | null>(
    null,
  );
  const [clinicians, setClinicians] = useState<EmergencyClinicianData[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [observingCase, setObservingCase] = useState<EmergencyCaseData | null>(
    null,
  );
  const [observationHistory, setObservationHistory] = useState<
    EmergencyObservationData[]
  >([]);
  const [isLoadingObservations, setIsLoadingObservations] = useState(false);
  const [isSavingObservation, setIsSavingObservation] = useState(false);
  const [observationForm, setObservationForm] = useState({
    heartRate: "",
    systolicBP: "",
    diastolicBP: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    temperatureC: "",
    glasgowComaScale: "",
    painScore: "",
    note: "",
  });
  const currentUser = useAuthStore((state) => state.user);
  const canAssign = ["ADMIN", "DOCTOR", "EMERGENCY_DOCTOR"].includes(
    currentUser?.role || "",
  );
  const canRecordObservations = [
    "ADMIN",
    "DOCTOR",
    "EMERGENCY_DOCTOR",
    "NURSE",
  ].includes(currentUser?.role || "");
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  // New Case Form state
  const [form, setForm] = useState({
    patientName: "",
    age: "",
    sex: "M" as "M" | "F" | "O",
    presentingComplaint: "",
    esi: 3 as EsiLevel,
    area: "",
    observations: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [statsRes, casesRes] = await Promise.all([
        fetchEmergencyStatsApi(),
        fetchTriageCasesApi(filter),
      ]);

      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
      if (casesRes.success && casesRes.cases) {
        setCases(casesRes.cases);
      }
    } catch (err) {
      console.error("Failed to load triage board:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();

    // Socket real-time synchronization
    const socket = getSocket();
    const handleUpdate = () => {
      loadData();
    };

    socket.on("emergency:triage_updated", handleUpdate);
    return () => {
      socket.off("emergency:triage_updated", handleUpdate);
    };
  }, [loadData]);

  useEffect(() => {
    if (!canAssign) return;
    fetchEmergencyCliniciansApi()
      .then((res) => setClinicians(res.clinicians || []))
      .catch(() =>
        setFeedback({
          type: "err",
          msg: "Could not load emergency clinicians.",
        }),
      );
  }, [canAssign]);

  const openAssignment = (emergencyCase: EmergencyCaseData) => {
    setAssigningCase(emergencyCase);
    setSelectedDoctorId(emergencyCase.assignedDoctorId || "");
  };

  const handleAssignCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningCase) return;
    setIsAssigning(true);
    setFeedback(null);
    try {
      await assignEmergencyCaseApi(assigningCase._id, selectedDoctorId || null);
      setAssigningCase(null);
      setFeedback({ type: "ok", msg: "ED clinician assignment updated." });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.response?.data?.message || "Could not assign clinician.",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const openObservations = async (emergencyCase: EmergencyCaseData) => {
    setObservingCase(emergencyCase);
    setObservationForm({
      heartRate: "",
      systolicBP: "",
      diastolicBP: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      temperatureC: "",
      glasgowComaScale: "",
      painScore: "",
      note: "",
    });
    setIsLoadingObservations(true);
    try {
      const response = await fetchEmergencyObservationsApi(emergencyCase._id);
      setObservationHistory(response.observations || []);
    } catch {
      setObservationHistory([]);
      setFeedback({ type: "err", msg: "Could not load observation history." });
    } finally {
      setIsLoadingObservations(false);
    }
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observingCase) return;
    const payload: CreateEmergencyObservationPayload = {
      ...(observationForm.heartRate
        ? { heartRate: Number(observationForm.heartRate) }
        : {}),
      ...(observationForm.systolicBP
        ? { systolicBP: Number(observationForm.systolicBP) }
        : {}),
      ...(observationForm.diastolicBP
        ? { diastolicBP: Number(observationForm.diastolicBP) }
        : {}),
      ...(observationForm.respiratoryRate
        ? { respiratoryRate: Number(observationForm.respiratoryRate) }
        : {}),
      ...(observationForm.oxygenSaturation
        ? { oxygenSaturation: Number(observationForm.oxygenSaturation) }
        : {}),
      ...(observationForm.temperatureC
        ? { temperatureC: Number(observationForm.temperatureC) }
        : {}),
      ...(observationForm.glasgowComaScale
        ? { glasgowComaScale: Number(observationForm.glasgowComaScale) }
        : {}),
      ...(observationForm.painScore
        ? { painScore: Number(observationForm.painScore) }
        : {}),
      ...(observationForm.note.trim()
        ? { note: observationForm.note.trim() }
        : {}),
    };
    if (Object.keys(payload).length === 0) {
      setFeedback({
        type: "err",
        msg: "Enter at least one observation or a nursing note.",
      });
      return;
    }
    setIsSavingObservation(true);
    setFeedback(null);
    try {
      await createEmergencyObservationApi(observingCase._id, payload);
      const history = await fetchEmergencyObservationsApi(observingCase._id);
      setObservationHistory(history.observations || []);
      setObservationForm({
        heartRate: "",
        systolicBP: "",
        diastolicBP: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        temperatureC: "",
        glasgowComaScale: "",
        painScore: "",
        note: "",
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.response?.data?.message || "Could not save observation.",
      });
    } finally {
      setIsSavingObservation(false);
    }
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.patientName.trim() ||
      !form.age ||
      !form.presentingComplaint.trim()
    ) {
      setFeedback({
        type: "err",
        msg: "Please fill in patient name, age, and complaint.",
      });
      return;
    }
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 0 || age > 130) {
      setFeedback({
        type: "err",
        msg: "Enter a whole-number age from 0 to 130.",
      });
      return;
    }
    if (
      form.patientName.trim().length > 120 ||
      form.presentingComplaint.trim().length > 500 ||
      form.observations.trim().length > 1000
    ) {
      setFeedback({
        type: "err",
        msg: "Name, complaint, or observations exceed the allowed length.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await createEmergencyCaseApi({
        patientName: form.patientName.trim(),
        age,
        sex: form.sex,
        presentingComplaint: form.presentingComplaint.trim(),
        esi: form.esi,
        area: form.area || (form.esi <= 2 ? "Resus" : "Waiting"),
        observations: form.observations.trim() || "obs pending",
      });

      if (res.success) {
        setFeedback({ type: "ok", msg: `Intake registered: ${res.case.id}` });
        setForm({
          patientName: "",
          age: "",
          sex: "M",
          presentingComplaint: "",
          esi: 3,
          area: "",
          observations: "",
        });
        setTimeout(() => {
          setIsIntakeOpen(false);
          setFeedback(null);
        }, 1200);
        await loadData();
      }
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg:
          err.response?.data?.message || "Failed to intake emergency patient",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispositionChange = async (
    caseId: string,
    disposition: EmergencyDisposition,
  ) => {
    try {
      await updateEmergencyCaseApi(caseId, { disposition });
      await loadData();
    } catch (err) {
      console.error("Failed to update disposition:", err);
    }
  };

  const handleDischarge = async (caseId: string) => {
    if (!confirm(`Mark case ${caseId} for discharge?`)) return;
    try {
      await dischargeEmergencyCaseApi(caseId);
      await loadData();
    } catch (err) {
      console.error("Failed to discharge case:", err);
    }
  };

  const statItems = [
    {
      label: "In department",
      value: String(stats.totalInDept),
      note: "active cases",
    },
    {
      label: "Awaiting triage",
      value: String(stats.awaitingTriage),
      note: "pending clinical review",
    },
    {
      label: "Time to clinician",
      value: stats.medianTimeToClinician,
      note: "median duration",
    },
    {
      label: "4-hour breaches",
      value: String(stats.fourHourBreaches),
      note: "against target standard",
    },
  ];

  return (
    <section className="relative">
      <PanelHeader
        index="01 / triage"
        title="ESI triage board"
        note="Live department board sorted by acuity. ESI 1–2 pulse until a clinician is assigned; waits count against the four-hour standard."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton onClick={() => setFilter("all")}>
              All ({filter === "all" ? cases.length : stats.totalInDept})
            </ActionButton>
            <ActionButton onClick={() => setFilter("waiting")}>
              Awaiting ({stats.awaitingTriage})
            </ActionButton>
            <ActionButton
              tone={filter === "esi12" ? "solid" : undefined}
              onClick={() => setFilter("esi12")}
            >
              ESI 1–2
            </ActionButton>
            <ActionButton tone="solid" onClick={() => setIsIntakeOpen(true)}>
              <Plus className="mr-1 inline size-3.5" />
              Intake Patient
            </ActionButton>
          </div>
        }
      />

      <StatGrid stats={statItems} />

      {/* Patient Intake Modal */}
      {isIntakeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-background hairline w-full max-w-lg rounded-none p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="mono-label text-accent font-bold">
                  EMERGENCY DEPARTMENT INTAKE
                </p>
                <h3 className="text-lg font-bold">Register Triage Patient</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIntakeOpen(false)}
                aria-label="Close intake dialog"
                title="Close intake dialog"
                className="text-muted-foreground hover:text-foreground p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Close intake dialog</span>
              </button>
            </div>

            {feedback && (
              <div
                className={`mt-4 p-3 text-xs mono-label flex items-center gap-2 ${
                  feedback.type === "ok"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{feedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleIntakeSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="triage-patient-name"
                    className="mono-label block text-muted-foreground text-xs"
                  >
                    Patient Name
                  </label>
                  <input
                    id="triage-patient-name"
                    type="text"
                    required={true}
                    placeholder="e.g. John Doe / Unknown patient"
                    maxLength={120}
                    value={form.patientName}
                    onChange={(e) =>
                      setForm({ ...form, patientName: e.target.value })
                    }
                    className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm focus:outline-hidden"
                  />
                </div>
                <div>
                  <label
                    htmlFor="triage-patient-age"
                    className="mono-label block text-muted-foreground text-xs"
                  >
                    Age & Sex
                  </label>
                  <div className="mt-1 flex gap-1">
                    <input
                      id="triage-patient-age"
                      type="number"
                      required={true}
                      min={0}
                      max={130}
                      placeholder="Age"
                      value={form.age}
                      onChange={(e) =>
                        setForm({ ...form, age: e.target.value })
                      }
                      className="hairline bg-foreground/3 w-16 p-2 text-sm focus:outline-hidden"
                    />
                    <select
                      id="triage-patient-sex"
                      aria-label="Sex"
                      title="Sex"
                      value={form.sex}
                      onChange={(e) =>
                        setForm({ ...form, sex: e.target.value as any })
                      }
                      className="hairline bg-foreground/3 flex-1 p-2 text-sm focus:outline-hidden"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                      <option value="O">O</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="triage-complaint"
                  className="mono-label block text-muted-foreground text-xs"
                >
                  Presenting Complaint
                </label>
                <input
                  id="triage-complaint"
                  type="text"
                  required={true}
                  placeholder="e.g. Severe chest pain radiating to left arm, diaphoresis"
                  maxLength={500}
                  value={form.presentingComplaint}
                  onChange={(e) =>
                    setForm({ ...form, presentingComplaint: e.target.value })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="triage-esi-acuity"
                    className="mono-label block text-muted-foreground text-xs"
                  >
                    ESI Triage Acuity (1 - 5)
                  </label>
                  <select
                    id="triage-esi-acuity"
                    value={form.esi}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        esi: parseInt(e.target.value, 10) as EsiLevel,
                      })
                    }
                    className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                  >
                    <option value={1}>
                      ESI 1 — Resuscitation (Immediate life-threat)
                    </option>
                    <option value={2}>
                      ESI 2 — Emergent (High risk / conf / severe pain)
                    </option>
                    <option value={3}>
                      ESI 3 — Urgent (Multiple resources required)
                    </option>
                    <option value={4}>
                      ESI 4 — Less Urgent (One resource required)
                    </option>
                    <option value={5}>ESI 5 — Non-urgent (No resource)</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="triage-target-area"
                    className="mono-label block text-muted-foreground text-xs"
                  >
                    Target Department Area
                  </label>
                  <input
                    id="triage-target-area"
                    type="text"
                    maxLength={80}
                    placeholder={form.esi <= 2 ? "e.g. Resus" : "e.g. Waiting"}
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="triage-observations"
                  className="mono-label block text-muted-foreground text-xs"
                >
                  Initial Observations
                </label>
                <input
                  id="triage-observations"
                  type="text"
                  placeholder="e.g. HR 112 · BP 142/90 · SpO2 94% · RR 24"
                  maxLength={1000}
                  value={form.observations}
                  onChange={(e) =>
                    setForm({ ...form, observations: e.target.value })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <ActionButton
                  type="button"
                  onClick={() => setIsIntakeOpen(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  tone="solid"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registering..." : "Confirm Intake"}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAssignCase}
            className="bg-background hairline w-full max-w-md space-y-4 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="mono-label text-accent text-xs font-bold">
                  {assigningCase.id}
                </p>
                <h3 className="font-mono text-lg font-bold">
                  Assign ED clinician
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close clinician assignment"
                onClick={() => setAssigningCase(null)}
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              This case will appear in the selected clinician&apos;s ED
              worklist.
            </p>
            <label
              htmlFor="emergency-clinician-select"
              className="mono-label block text-xs text-muted-foreground"
            >
              Responsible clinician
            </label>
            <select
              id="emergency-clinician-select"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="hairline bg-foreground/3 -mt-3 w-full p-2 text-sm"
            >
              <option value="">Unassigned</option>
              {clinicians.map((clinician) => (
                <option key={clinician._id} value={clinician._id}>
                  {clinician.name} ·{" "}
                  {clinician.role === "EMERGENCY_DOCTOR"
                    ? "Emergency doctor"
                    : "Doctor"}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 border-t pt-4">
              <ActionButton
                type="button"
                onClick={() => setAssigningCase(null)}
              >
                Cancel
              </ActionButton>
              <ActionButton type="submit" tone="solid" disabled={isAssigning}>
                {isAssigning ? "Assigning…" : "Save assignment"}
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {observingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-background hairline max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="mono-label text-accent text-xs font-bold">
                  {observingCase.id}
                </p>
                <h3 className="font-mono text-lg font-bold">
                  Nursing observations
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close observations"
                onClick={() => setObservingCase(null)}
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleSaveObservation} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["heartRate", "Heart rate", "bpm", 0, 300, 1],
                    ["systolicBP", "Systolic BP", "mmHg", 0, 350, 1],
                    ["diastolicBP", "Diastolic BP", "mmHg", 0, 250, 1],
                    ["respiratoryRate", "Resp. rate", "/min", 0, 100, 1],
                    ["oxygenSaturation", "SpO₂", "%", 0, 100, 1],
                    ["temperatureC", "Temperature", "°C", 25, 45, 0.1],
                    ["glasgowComaScale", "GCS", "/15", 3, 15, 1],
                    ["painScore", "Pain score", "/10", 0, 10, 1],
                  ] as const
                ).map(([field, label, unit, min, max, step]) => (
                  <label
                    key={field}
                    className="mono-label text-xs text-muted-foreground"
                  >
                    {label}
                    <span className="ml-1 opacity-70">{unit}</span>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={step}
                      value={observationForm[field]}
                      onChange={(e) =>
                        setObservationForm({
                          ...observationForm,
                          [field]: e.target.value,
                        })
                      }
                      className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
              <label className="mono-label block text-xs text-muted-foreground">
                Nursing note
                <textarea
                  maxLength={1000}
                  rows={2}
                  value={observationForm.note}
                  onChange={(e) =>
                    setObservationForm({
                      ...observationForm,
                      note: e.target.value,
                    })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm text-foreground"
                  placeholder="Optional context; record only what was observed"
                />
              </label>
              {feedback?.type === "err" && (
                <p role="alert" className="text-sm text-destructive">
                  {feedback.msg}
                </p>
              )}
              <div className="flex justify-end gap-2 border-b pb-4">
                <ActionButton
                  type="submit"
                  tone="solid"
                  disabled={isSavingObservation}
                >
                  {isSavingObservation ? "Saving…" : "Record observation"}
                </ActionButton>
              </div>
            </form>
            <div className="mt-4">
              <h4 className="mono-label text-xs font-bold">
                Observation history
              </h4>
              {isLoadingObservations ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Loading history…
                </p>
              ) : observationHistory.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No observations recorded yet.
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {observationHistory.map((observation) => {
                    const values = [
                      observation.heartRate !== undefined
                        ? `HR ${observation.heartRate}`
                        : null,
                      observation.systolicBP !== undefined
                        ? `BP ${observation.systolicBP}/${observation.diastolicBP}`
                        : null,
                      observation.oxygenSaturation !== undefined
                        ? `SpO₂ ${observation.oxygenSaturation}%`
                        : null,
                      observation.respiratoryRate !== undefined
                        ? `RR ${observation.respiratoryRate}`
                        : null,
                      observation.temperatureC !== undefined
                        ? `Temp ${observation.temperatureC}°C`
                        : null,
                      observation.glasgowComaScale !== undefined
                        ? `GCS ${observation.glasgowComaScale}`
                        : null,
                      observation.painScore !== undefined
                        ? `Pain ${observation.painScore}/10`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const by =
                      typeof observation.recordedBy === "object"
                        ? observation.recordedBy.name
                        : "Clinical staff";
                    return (
                      <li
                        key={observation._id}
                        className="hairline bg-foreground/2 p-3"
                      >
                        <p className="text-sm font-medium">
                          {values || observation.note}
                        </p>
                        {values && observation.note && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {observation.note}
                          </p>
                        )}
                        <p className="mono-label mt-2 text-xs text-muted-foreground">
                          {new Date(observation.recordedAt).toLocaleString()} ·{" "}
                          {by}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="hairline-t overflow-x-auto">
        <table className="w-full min-w-250">
          <thead className="hairline-b">
            <tr>
              <Th>ID</Th>
              <Th>Patient</Th>
              <Th>Presenting complaint</Th>
              <Th>ESI</Th>
              <Th>Observations</Th>
              <Th>Area</Th>
              <Th>Wait</Th>
              <Th>Disposition</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  role="status"
                  aria-live="polite"
                  className="p-8 text-center mono-label text-muted-foreground animate-pulse"
                >
                  Loading live department triage feed...
                </td>
              </tr>
            ) : cases.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center mono-label text-muted-foreground"
                >
                  No active patients matching selected filter.
                </td>
              </tr>
            ) : (
              cases.map((t) => (
                <tr key={t.id} className="hairline-b hover:bg-foreground/2">
                  <Td>
                    <span className="mono-label font-bold text-accent">
                      {t.id}
                    </span>
                  </Td>
                  <Td>
                    <p className="font-medium">{t.patient}</p>
                    <p className="mono-label text-muted-foreground">
                      {t.age}
                      {t.sex} · arrived {t.arrived}
                    </p>
                    <p className="mono-label text-muted-foreground">
                      {t.assignedDoctorName
                        ? `Dr. ${t.assignedDoctorName}`
                        : "No clinician assigned"}
                    </p>
                  </Td>
                  <Td className="max-w-xs truncate">{t.complaint}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      {t.esi <= 2 && <LiveDot tone="bad" />}
                      <Pill tone={esiTone(t.esi)}>ESI {t.esi}</Pill>
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">
                      {t.obs}
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label font-medium">{t.area}</span>
                  </Td>
                  <Td>
                    <span
                      className={`font-mono font-bold ${t.waitMin > 60 ? "text-destructive" : ""}`}
                    >
                      {t.waitMin}′
                    </span>
                  </Td>
                  <Td>
                    <select
                      id={`triage-disposition-${t.id}`}
                      aria-label={`Update disposition for patient ${t.patient} (${t.id})`}
                      value={t.disposition}
                      onChange={(e) =>
                        handleDispositionChange(
                          t.id,
                          e.target.value as EmergencyDisposition,
                        )
                      }
                      className="hairline bg-foreground/2 text-xs p-1 font-mono rounded-none focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary/40"
                    >
                      <option value="awaiting triage">awaiting triage</option>
                      <option value="in bay">in bay</option>
                      <option value="awaiting bed">awaiting bed</option>
                      <option value="admitted">admitted</option>
                      <option value="for discharge">for discharge</option>
                    </select>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {canAssign && (
                        <button
                          type="button"
                          onClick={() => openAssignment(t)}
                          className="mono-label text-xs underline hover:text-accent"
                        >
                          {t.assignedDoctorName ? "Reassign" : "Assign doctor"}
                        </button>
                      )}
                      {canRecordObservations && (
                        <button
                          type="button"
                          onClick={() => void openObservations(t)}
                          className="mono-label text-xs underline hover:text-accent"
                        >
                          Record observations
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDischarge(t.id)}
                        className="mono-label text-xs hover:text-destructive underline"
                      >
                        Discharge
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
