"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  fetchEmergencyMedicationChartApi,
  recordEmergencyMedicationAdministrationApi,
  type EmergencyCaseData,
  type EmergencyEncounterMedicine,
  type EmergencyMedicationAdministrationData,
} from "@/lib/api/emergency";

type AdministrationState = EmergencyMedicationAdministrationData["state"];

export function EmergencyMedicationPanel({ caseId }: { caseId: string }) {
  const [patient, setPatient] = useState<EmergencyCaseData | null>(null);
  const [medicines, setMedicines] = useState<EmergencyEncounterMedicine[]>([]);
  const [history, setHistory] = useState<
    EmergencyMedicationAdministrationData[]
  >([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchEmergencyMedicationChartApi(caseId);
      setPatient(result.case);
      setMedicines(result.consultation?.medicines || []);
      setHistory(result.administrations || []);
    } catch (cause: any) {
      setError(
        cause?.response?.data?.message ||
          "Unable to load this medication chart.",
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const record = async (
    medicine: EmergencyEncounterMedicine,
    state: AdministrationState,
  ) => {
    if (!medicine._id) return;
    const note = notes[medicine._id]?.trim() || "";
    if (state !== "GIVEN" && !note) {
      setError(
        "Add the reason before recording a medicine as held or refused.",
      );
      return;
    }
    setSaving(medicine._id);
    setError(null);
    try {
      await recordEmergencyMedicationAdministrationApi(caseId, medicine._id, {
        state,
        ...(note ? { note } : {}),
      });
      setNotes((current) => ({ ...current, [medicine._id!]: "" }));
      await load();
    } catch (cause: any) {
      setError(
        cause?.response?.data?.message ||
          "Unable to record this medication event.",
      );
    } finally {
      setSaving(null);
    }
  };

  if (loading)
    return (
      <div
        role="status"
        className="p-12 text-center mono-label text-muted-foreground animate-pulse"
      >
        Loading ED medication chart…
      </div>
    );
  if (!patient)
    return (
      <div
        role="alert"
        className="hairline bg-background p-8 text-sm text-destructive"
      >
        {error || "Emergency case not found."}
      </div>
    );

  return (
    <section className="relative space-y-px bg-border">
      <div className="bg-background px-5 pt-4 sm:px-8">
        <Link
          href="/emergency"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          ED triage board
        </Link>
      </div>
      <PanelHeader
        index="03 / nursing medication chart"
        title={`${patient.id} · ${patient.patient}`}
        note={`ESI ${patient.esi} · ${patient.complaint}`}
        actions={
          <ActionButton onClick={() => void load()}>
            <RefreshCw className="mr-1 inline size-3" />
            Refresh
          </ActionButton>
        }
      />
      {error && (
        <p
          role="alert"
          className="bg-background px-5 py-3 text-sm text-destructive sm:px-8"
        >
          {error}
        </p>
      )}
      <div className="space-y-px">
        <section className="bg-background p-5 sm:p-7">
          <h2 className="font-display text-lg font-semibold">
            Signed medication orders
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the pharmacy workflow for stock, billing, and dispensing. Record
            each administration event here at the time it happens.
          </p>
          {medicines.length === 0 ? (
            <p className="hairline mt-4 bg-foreground/2 p-5 text-sm text-muted-foreground">
              No signed medication orders for this case.
            </p>
          ) : (
            <div className="mt-4 space-y-px bg-border">
              {medicines.map((medicine, index) => {
                const events = history.filter(
                  (event) => event.medicineId === medicine._id,
                );
                return (
                  <article
                    key={medicine._id || index}
                    className="bg-background p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{medicine.name}</h3>
                        <p className="mono-label mt-1 text-xs text-muted-foreground">
                          {medicine.dosage} ·{" "}
                          {medicine.route || "Route not specified"} ·{" "}
                          {medicine.frequency} · {medicine.duration}
                        </p>
                        {medicine.instructions && (
                          <p className="mt-2 text-sm">
                            {medicine.instructions}
                          </p>
                        )}
                      </div>
                      <span className="mono-label text-xs text-muted-foreground">
                        {events.length} recorded event
                        {events.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <label className="mt-4 block">
                      <span className="mono-label text-xs text-muted-foreground">
                        Note / reason (required for held or refused)
                      </span>
                      <input
                        maxLength={1000}
                        value={medicine._id ? notes[medicine._id] || "" : ""}
                        onChange={(event) =>
                          medicine._id &&
                          setNotes((current) => ({
                            ...current,
                            [medicine._id!]: event.target.value,
                          }))
                        }
                        className="hairline mt-1 w-full bg-foreground/2 p-2 text-sm"
                        placeholder="Optional for given; explain if held or refused"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(
                        ["GIVEN", "HELD", "REFUSED"] as AdministrationState[]
                      ).map((state) => (
                        <ActionButton
                          key={state}
                          onClick={() => void record(medicine, state)}
                          disabled={!medicine._id || saving === medicine._id}
                        >
                          {saving === medicine._id
                            ? "Saving…"
                            : `Record ${state.toLowerCase()}`}
                        </ActionButton>
                      ))}
                    </div>
                    {events.length > 0 && (
                      <ol className="mt-4 space-y-2 border-l border-border pl-4">
                        {events.map((event) => (
                          <li
                            key={event._id}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-semibold text-foreground">
                              {event.state}
                            </span>{" "}
                            · {new Date(event.recordedAt).toLocaleString()} ·{" "}
                            {typeof event.recordedBy === "object"
                              ? event.recordedBy.name
                              : "Nurse"}
                            {event.note ? ` · ${event.note}` : ""}
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
