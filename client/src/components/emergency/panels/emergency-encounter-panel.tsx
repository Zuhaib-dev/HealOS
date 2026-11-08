"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import { openProtectedReport } from "@/lib/api/reports";
import {
  fetchEmergencyEncounterApi,
  saveEmergencyEncounterApi,
  type EmergencyCaseData,
  type EmergencyEncounterData,
  type EmergencyEncounterMedicine,
  type EmergencyDiagnosticOrderDraft,
  type EmergencyDiagnosticOrderResult,
} from "@/lib/api/emergency";

const emptyMedicine = (): EmergencyEncounterMedicine => ({
  name: "",
  dosage: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
});

const emptyDiagnosticOrder = (): EmergencyDiagnosticOrderDraft => ({
  testType: "PATHOLOGY",
  testName: "",
  priority: "ROUTINE",
  clinicalNotes: "",
});

export function EmergencyEncounterPanel({ caseId }: { caseId: string }) {
  const [emergencyCase, setEmergencyCase] = useState<EmergencyCaseData | null>(
    null,
  );
  const [diagnostics, setDiagnostics] = useState<
    EmergencyDiagnosticOrderResult[]
  >([]);
  const [encounter, setEncounter] = useState<EmergencyEncounterData>({
    chiefComplaint: "",
    assessment: "",
    diagnosis: "",
    advice: "",
    medicines: [],
    diagnosticOrders: [],
    status: "DRAFT",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetchEmergencyEncounterApi(caseId);
      setEmergencyCase(response.case);
      setDiagnostics(response.diagnostics || []);
      if (response.encounter) {
        setEncounter({
          _id: response.encounter._id,
          chiefComplaint:
            response.encounter.chiefComplaint || response.case.complaint,
          assessment: response.encounter.assessment || "",
          diagnosis: response.encounter.diagnosis || "",
          advice: response.encounter.advice || "",
          medicines: response.encounter.medicines || [],
          diagnosticOrders: response.encounter.diagnosticOrders || [],
          status: response.encounter.status,
        });
      } else {
        setEncounter((current) => ({
          ...current,
          chiefComplaint: response.case.complaint,
        }));
      }
    } catch (err) {
      setError(
        (err as any)?.response?.data?.message ||
          "Unable to open this ED encounter.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (status: "DRAFT" | "COMPLETED") => {
    if (!emergencyCase) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = { ...encounter, status };
      const response = await saveEmergencyEncounterApi(caseId, payload);
      setEncounter(response.consultation);
      setEmergencyCase(response.case);
      setDiagnostics(response.diagnostics || []);
      setMessage(
        status === "COMPLETED"
          ? [
              encounter.medicines.some((medicine) => medicine.name.trim())
                ? "Prescription sent to pharmacy"
                : "",
              encounter.diagnosticOrders.some((order) => order.testName.trim())
                ? "diagnostics routed to lab/radiology"
                : "",
            ].filter(Boolean).length > 0
            ? `Encounter signed; ${[
                encounter.medicines.some((medicine) => medicine.name.trim())
                  ? "prescription sent to pharmacy"
                  : "",
                encounter.diagnosticOrders.some((order) =>
                  order.testName.trim(),
                )
                  ? "diagnostics routed to lab/radiology"
                  : "",
              ]
                .filter(Boolean)
                .join(" and ")}.`
            : "Encounter signed and saved."
          : "Draft saved.",
      );
    } catch (err) {
      setError(
        (err as any)?.response?.data?.message ||
          "Unable to save this ED encounter.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateMedicine = (
    index: number,
    field: keyof EmergencyEncounterMedicine,
    value: string,
  ) => {
    setEncounter((current) => ({
      ...current,
      medicines: current.medicines.map((medicine, medicineIndex) =>
        medicineIndex === index ? { ...medicine, [field]: value } : medicine,
      ),
    }));
  };

  const updateDiagnosticOrder = (
    index: number,
    field: keyof EmergencyDiagnosticOrderDraft,
    value: string,
  ) => {
    setEncounter((current) => ({
      ...current,
      diagnosticOrders: current.diagnosticOrders.map((order, orderIndex) =>
        orderIndex === index ? { ...order, [field]: value } : order,
      ),
    }));
  };

  if (isLoading) {
    return (
      <div
        role="status"
        className="p-12 text-center mono-label text-muted-foreground animate-pulse"
      >
        Loading ED encounter…
      </div>
    );
  }
  if (!emergencyCase) {
    return (
      <div
        role="alert"
        className="hairline bg-background p-8 text-sm text-destructive"
      >
        {error || "Emergency case not found."}
      </div>
    );
  }

  return (
    <section className="relative space-y-px bg-border">
      <div className="bg-background px-5 pt-4 sm:px-8">
        <Link
          href="/emergency/worklist"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          My ED cases
        </Link>
      </div>
      <PanelHeader
        index="02 / clinical encounter"
        title={`${emergencyCase.id} · ${emergencyCase.patient}`}
        note={`${emergencyCase.age}${emergencyCase.sex} · ESI ${emergencyCase.esi} · ${emergencyCase.complaint}`}
        actions={
          <ActionButton onClick={() => void load()}>
            <RefreshCw className="mr-1 inline size-3" />
            Refresh
          </ActionButton>
        }
      />
      <div className="grid gap-px lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-px">
          <section className="bg-background p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Assessment</h2>
              <Pill tone={encounter.status === "COMPLETED" ? "ok" : "warn"}>
                {encounter.status}
              </Pill>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ed-chief-complaint"
                  className="mono-label text-xs text-muted-foreground"
                >
                  Presenting complaint
                </label>
                <p
                  id="ed-chief-complaint"
                  className="hairline mt-1 bg-foreground/2 p-3 text-sm"
                >
                  {emergencyCase.complaint}
                </p>
              </div>
              <label className="block">
                <span className="mono-label text-xs text-muted-foreground">
                  Clinical assessment
                </span>
                <textarea
                  maxLength={4000}
                  rows={4}
                  value={encounter.assessment}
                  onChange={(e) =>
                    setEncounter({ ...encounter, assessment: e.target.value })
                  }
                  className="hairline bg-foreground/2 mt-1 w-full p-3 text-sm"
                  placeholder="Record examination and assessment findings"
                />
              </label>
              <label className="block">
                <span className="mono-label text-xs text-muted-foreground">
                  Diagnosis
                </span>
                <textarea
                  maxLength={2000}
                  rows={2}
                  value={encounter.diagnosis}
                  onChange={(e) =>
                    setEncounter({ ...encounter, diagnosis: e.target.value })
                  }
                  className="hairline bg-foreground/2 mt-1 w-full p-3 text-sm"
                  placeholder="Required to sign the encounter"
                />
              </label>
              <label className="block">
                <span className="mono-label text-xs text-muted-foreground">
                  Plan / advice
                </span>
                <textarea
                  maxLength={4000}
                  rows={3}
                  value={encounter.advice}
                  onChange={(e) =>
                    setEncounter({ ...encounter, advice: e.target.value })
                  }
                  className="hairline bg-foreground/2 mt-1 w-full p-3 text-sm"
                  placeholder="Plan and follow-up instructions"
                />
              </label>
            </div>
          </section>

          <section className="bg-background p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Medication orders
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Signing the encounter sends these orders to the pharmacy
                  queue.
                </p>
              </div>
              <ActionButton
                onClick={() =>
                  setEncounter({
                    ...encounter,
                    medicines: [...encounter.medicines, emptyMedicine()],
                  })
                }
              >
                <Plus className="mr-1 inline size-3" />
                Add medicine
              </ActionButton>
            </div>
            {encounter.medicines.length === 0 ? (
              <div className="hairline bg-foreground/2 p-5 text-sm text-muted-foreground">
                No medication orders added.
              </div>
            ) : (
              <div className="space-y-3">
                {encounter.medicines.map((medicine, index) => (
                  <div
                    key={medicine._id || index}
                    className="hairline grid gap-3 bg-foreground/2 p-4 sm:grid-cols-2"
                  >
                    <label className="mono-label text-xs text-muted-foreground sm:col-span-2">
                      Medicine name
                      <input
                        maxLength={160}
                        value={medicine.name}
                        onChange={(e) =>
                          updateMedicine(index, "name", e.target.value)
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder="Medication name"
                      />
                    </label>
                    <label className="mono-label text-xs text-muted-foreground">
                      Dose
                      <input
                        maxLength={120}
                        value={medicine.dosage}
                        onChange={(e) =>
                          updateMedicine(index, "dosage", e.target.value)
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder="Dose"
                      />
                    </label>
                    <label className="mono-label text-xs text-muted-foreground">
                      Route
                      <input
                        maxLength={80}
                        value={medicine.route}
                        onChange={(e) =>
                          updateMedicine(index, "route", e.target.value)
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder="Oral, IV, etc."
                      />
                    </label>
                    <label className="mono-label text-xs text-muted-foreground">
                      Frequency
                      <input
                        maxLength={120}
                        value={medicine.frequency}
                        onChange={(e) =>
                          updateMedicine(index, "frequency", e.target.value)
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder="Frequency"
                      />
                    </label>
                    <label className="mono-label text-xs text-muted-foreground">
                      Duration
                      <input
                        maxLength={120}
                        value={medicine.duration}
                        onChange={(e) =>
                          updateMedicine(index, "duration", e.target.value)
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder="Duration"
                      />
                    </label>
                    <label className="mono-label text-xs text-muted-foreground sm:col-span-2">
                      Instructions
                      <input
                        maxLength={500}
                        value={medicine.instructions || ""}
                        onChange={(e) =>
                          updateMedicine(index, "instructions", e.target.value)
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder="Optional instructions"
                      />
                    </label>
                    <div className="flex justify-end sm:col-span-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEncounter({
                            ...encounter,
                            medicines: encounter.medicines.filter(
                              (_, medicineIndex) => medicineIndex !== index,
                            ),
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs text-destructive"
                      >
                        <Trash2 className="size-3" />
                        Remove order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-background p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Diagnostic orders
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Signed orders appear in the pathology or radiology worklist.
                </p>
              </div>
              <ActionButton
                onClick={() =>
                  setEncounter({
                    ...encounter,
                    diagnosticOrders: [
                      ...encounter.diagnosticOrders,
                      emptyDiagnosticOrder(),
                    ],
                  })
                }
              >
                <Plus className="mr-1 inline size-3" />
                Add test
              </ActionButton>
            </div>
            {encounter.diagnosticOrders.length === 0 ? (
              <div className="hairline bg-foreground/2 p-5 text-sm text-muted-foreground">
                No diagnostic orders added.
              </div>
            ) : (
              <div className="space-y-3">
                {encounter.diagnosticOrders.map((order, index) => (
                  <div
                    key={`${order.testType}-${index}`}
                    className="hairline grid gap-3 bg-foreground/2 p-4 sm:grid-cols-2"
                  >
                    <label className="mono-label text-xs text-muted-foreground">
                      Department
                      <select
                        value={order.testType}
                        onChange={(event) =>
                          updateDiagnosticOrder(
                            index,
                            "testType",
                            event.target.value,
                          )
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                      >
                        <option value="PATHOLOGY">
                          Laboratory / pathology
                        </option>
                        <option value="RADIOLOGY">Radiology</option>
                      </select>
                    </label>
                    <label className="mono-label text-xs text-muted-foreground">
                      Priority
                      <select
                        value={order.priority}
                        onChange={(event) =>
                          updateDiagnosticOrder(
                            index,
                            "priority",
                            event.target.value,
                          )
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                      >
                        <option value="ROUTINE">Routine</option>
                        <option value="URGENT">Urgent</option>
                        <option value="STAT">STAT</option>
                      </select>
                    </label>
                    <label className="mono-label text-xs text-muted-foreground sm:col-span-2">
                      Test name
                      <input
                        maxLength={200}
                        value={order.testName}
                        onChange={(event) =>
                          updateDiagnosticOrder(
                            index,
                            "testName",
                            event.target.value,
                          )
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder={
                          order.testType === "PATHOLOGY"
                            ? "CBC, electrolytes…"
                            : "Chest X-ray, CT…"
                        }
                      />
                    </label>
                    <label className="mono-label text-xs text-muted-foreground sm:col-span-2">
                      Clinical indication
                      <input
                        maxLength={1000}
                        value={order.clinicalNotes || ""}
                        onChange={(event) =>
                          updateDiagnosticOrder(
                            index,
                            "clinicalNotes",
                            event.target.value,
                          )
                        }
                        className="hairline bg-background mt-1 w-full p-2 text-sm text-foreground"
                        placeholder="Reason for investigation"
                      />
                    </label>
                    <div className="flex justify-end sm:col-span-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEncounter({
                            ...encounter,
                            diagnosticOrders: encounter.diagnosticOrders.filter(
                              (_, orderIndex) => orderIndex !== index,
                            ),
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs text-destructive"
                      >
                        <Trash2 className="size-3" />
                        Remove order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-px">
          <section className="bg-background p-5 sm:p-7">
            <h2 className="font-display text-lg font-semibold">
              Latest observations
            </h2>
            <p className="mono-label mt-3 text-sm text-muted-foreground">
              {emergencyCase.obs || "No observations recorded"}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              The nursing chart keeps the timestamped history on the triage
              board.
            </p>
          </section>
          <section className="bg-background p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                Investigation status
              </h2>
              <span className="mono-label text-xs text-muted-foreground">
                {diagnostics.length} signed
              </span>
            </div>
            {diagnostics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Signed investigations will appear here as lab and radiology
                teams process them.
              </p>
            ) : (
              <ul className="space-y-3">
                {diagnostics.map((order) => (
                  <li key={order._id} className="hairline bg-foreground/2 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-sm">{order.testName}</strong>
                      <span className="mono-label text-xs">
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mono-label mt-1 text-xs text-muted-foreground">
                      {order.testType} · {order.priority}
                      {order.accessionNumber
                        ? ` · ${order.accessionNumber}`
                        : ""}
                    </p>
                    {order.status === "REPORTED" &&
                      order.report?.state === "pending sign" && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Report is awaiting verification.
                        </p>
                      )}
                    {order.report?.isCritical && (
                      <p className="mt-2 text-xs font-semibold text-destructive">
                        Critical result — review immediately
                      </p>
                    )}
                    {order.report?.findings && (
                      <p className="mt-2 text-sm">{order.report.findings}</p>
                    )}
                    {order.report?.comments && (
                      <p className="mt-2 text-sm">{order.report.comments}</p>
                    )}
                    {order.report?.structuredResults &&
                      order.report.structuredResults.length > 0 && (
                        <ul className="mt-2 space-y-1 border-l border-border pl-3">
                          {order.report.structuredResults.map(
                            (result, index) => (
                              <li
                                key={`${result.analyteName}-${index}`}
                                className="text-xs text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">
                                  {result.analyteName}:
                                </span>{" "}
                                {result.value} {result.unit || ""} ·{" "}
                                {result.flag.replaceAll("_", " ")}
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    {order.report?._id && order.report.state === "verified" && (
                      <button
                        type="button"
                        onClick={() =>
                          void openProtectedReport(order.report!._id!).catch(
                            () =>
                              setError("Unable to open the released report."),
                          )
                        }
                        className="mt-3 text-xs font-semibold text-primary underline"
                      >
                        Open released report
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bg-background p-5 sm:p-7">
            <h2 className="font-display text-lg font-semibold">
              Encounter actions
            </h2>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="mt-3 text-sm text-accent">
                {message}
              </p>
            )}
            <div className="mt-4 grid gap-2">
              <ActionButton
                onClick={() => void save("DRAFT")}
                disabled={isSaving || encounter.status === "COMPLETED"}
              >
                {isSaving ? "Saving…" : "Save draft"}
              </ActionButton>
              <ActionButton
                tone="solid"
                onClick={() => void save("COMPLETED")}
                disabled={isSaving || encounter.status === "COMPLETED"}
              >
                {isSaving ? "Signing…" : "Sign encounter"}
              </ActionButton>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Signing requires a diagnosis. Medication and diagnostic orders
              route to their staff worklists after signature.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
