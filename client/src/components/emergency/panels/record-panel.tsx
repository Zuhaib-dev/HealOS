"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, FileText, RefreshCw } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import {
  fetchEmergencyRecordApi,
  type EmergencyCaseData,
} from "@/lib/api/emergency";

type RecordPayload = {
  case: EmergencyCaseData;
  encounter: any;
  observations: any[];
  diagnostics: any[];
  administrations: any[];
  admission: any;
  pharmacy: any[];
};
const dateLabel = (value?: string | Date) =>
  value ? new Date(value).toLocaleString() : "—";

export function EmergencyRecordPanel({ recordId }: { recordId: string }) {
  const [data, setData] = useState<RecordPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setData(await fetchEmergencyRecordApi(recordId));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load this ED record.");
    } finally {
      setBusy(false);
    }
  }, [recordId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (busy)
    return (
      <p
        role="status"
        className="p-12 text-center mono-label text-muted-foreground"
      >
        Loading ED patient record…
      </p>
    );
  if (!data)
    return (
      <div className="p-8">
        <Link href="/emergency/records" className="mono-label text-accent">
          ← ED records
        </Link>
        <p role="alert" className="mt-6">
          {error}
        </p>
      </div>
    );
  const {
    case: c,
    encounter,
    observations,
    diagnostics,
    administrations,
    admission,
    pharmacy,
  } = data;
  const timeline = [
    ...observations.map((event) => ({
      at: event.recordedAt,
      type: "Nursing observation",
      title: event.note || "Observations recorded",
      detail: [
        event.heartRate && `HR ${event.heartRate}`,
        (event.systolicBP || event.diastolicBP) &&
          `BP ${event.systolicBP || "—"}/${event.diastolicBP || "—"}`,
        event.respiratoryRate && `RR ${event.respiratoryRate}`,
        event.oxygenSaturation && `SpO₂ ${event.oxygenSaturation}%`,
        event.temperatureC && `${event.temperatureC}°C`,
        event.glasgowComaScale && `GCS ${event.glasgowComaScale}`,
        event.painScore !== undefined && `Pain ${event.painScore}/10`,
      ]
        .filter(Boolean)
        .join(" · "),
      by: event.recordedBy?.name,
    })),
    ...diagnostics.map((event) => ({
      at: event.updatedAt || event.createdAt,
      type: `${event.testType || "Diagnostic"} · ${event.status}`,
      title: event.testName,
      detail:
        event.report?.state === "verified"
          ? event.report.findings || event.report.comments || "Verified result"
          : event.report
            ? "Result is awaiting verification; clinical result is withheld."
            : event.specimenStatus
              ? `Specimen: ${event.specimenStatus}`
              : event.priority,
      by: "",
    })),
    ...administrations.map((event) => ({
      at: event.recordedAt,
      type: `Medication ${event.state.toLowerCase()}`,
      title: `${event.medicineName} · ${event.dose} · ${event.route}`,
      detail: event.note,
      by: event.recordedBy?.name,
    })),
    ...(encounter
      ? [
          {
            at: encounter.updatedAt || encounter.createdAt,
            type: `Clinician encounter · ${encounter.status}`,
            title: encounter.diagnosis || "Encounter recorded",
            detail: [encounter.assessment, encounter.advice]
              .filter(Boolean)
              .join(" · "),
            by: encounter.doctor?.name,
          },
        ]
      : []),
    ...(admission
      ? [
          {
            at: admission.admittedAt || admission.createdAt,
            type: `Ward admission · ${admission.status}`,
            title: admission.ward?.name || "Admission",
            detail: admission.reason || admission.diagnosis,
            by: admission.admittedBy?.name,
          },
        ]
      : []),
    ...pharmacy.map((event) => ({
      at: event.dispensedAt || event.createdAt,
      type: `Pharmacy · ${event.status.replaceAll("_", " ").toLowerCase()}`,
      title: `${event.items?.length || 0} dispensed items`,
      detail: event.items
        ?.map((item: any) => `${item.name} × ${item.quantity}`)
        .join(" · "),
      by: "",
    })),
    {
      at: c.arrivedAt,
      type: "ED arrival",
      title: c.complaint,
      detail: `${c.area} · ESI ${c.esi} · ${c.disposition}`,
      by: "",
    },
    ...(c.dischargedAt
      ? [
          {
            at: c.dischargedAt,
            type: "ED discharge",
            title: c.diagnosisSummary || c.disposition,
            detail: "Visit closed",
            by: "",
          },
        ]
      : []),
  ]
    .filter((event) => event.at)
    .sort((a, b) => Date.parse(String(b.at)) - Date.parse(String(a.at)));
  return (
    <section>
      <PanelHeader
        index="ED patient record"
        title={c.patient}
        note={`${c.id} · ${c.age}${c.sex} · arrived ${dateLabel(c.arrivedAt)}`}
        actions={
          <ActionButton onClick={() => void load()}>
            <RefreshCw className="mr-1 inline size-3" /> Refresh
          </ActionButton>
        }
      />
      <div className="border-y border-border bg-background p-4 sm:p-6">
        <Link
          href="/emergency/records"
          className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="size-4" />
          All ED records
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Pill tone={c.esi <= 2 ? "bad" : c.esi === 3 ? "warn" : "mute"}>
            ESI {c.esi}
          </Pill>
          <Pill tone="mute">{c.disposition}</Pill>
          {c.encounterStatus && (
            <Pill tone={c.encounterStatus === "COMPLETED" ? "ok" : "warn"}>
              Encounter {c.encounterStatus.toLowerCase()}
            </Pill>
          )}
        </div>
        <p className="mt-4 text-lg font-semibold">{c.complaint}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {c.area} · {c.assignedDoctorName || "No clinician assigned"} · triage
          observations: {c.obs || "not recorded"}
        </p>
        {c.triageNotes && (
          <p className="mt-3 whitespace-pre-wrap text-sm">{c.triageNotes}</p>
        )}
      </div>
      <div className="grid gap-px border-b border-border bg-border md:grid-cols-2">
        <article className="bg-background p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileText className="size-4 text-accent" />
            Clinician encounter
          </h2>
          {encounter ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {encounter.status}
              </p>
              <p>
                <span className="text-muted-foreground">Diagnosis:</span>{" "}
                {encounter.diagnosis || "Not documented"}
              </p>
              <p>
                <span className="text-muted-foreground">Assessment:</span>{" "}
                {encounter.assessment || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Plan / advice:</span>{" "}
                {encounter.advice || "—"}
              </p>
              {encounter.medicines?.length > 0 && (
                <div>
                  <p className="mb-1 text-muted-foreground">Prescription</p>
                  <ul className="list-inside list-disc">
                    {encounter.medicines.map((m: any, i: number) => (
                      <li key={i}>
                        {m.name} · {m.dosage} · {m.route} · {m.frequency} ·{" "}
                        {m.duration}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No encounter recorded.
            </p>
          )}
        </article>
        <article className="bg-background p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-4 text-accent" />
            Disposition & handoff
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Disposition:</span>{" "}
              {c.disposition}
            </p>
            <p>
              <span className="text-muted-foreground">Diagnosis summary:</span>{" "}
              {c.diagnosisSummary || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Closed:</span>{" "}
              {dateLabel(c.dischargedAt)}
            </p>
            {admission && (
              <p>
                <span className="text-muted-foreground">Ward:</span>{" "}
                {admission.ward?.name || "Admission recorded"} ·{" "}
                {admission.status}
              </p>
            )}
            <div className="pt-2">
              <Link
                href={`/emergency/admissions/${encodeURIComponent(c._id)}`}
                className="text-accent hover:underline"
              >
                Open admission handoff
              </Link>
            </div>
          </div>
        </article>
      </div>
      <div className="border-b border-border bg-background p-5">
        <h2 className="font-semibold">Visit timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Case-linked observations, decisions, medication events, orders,
          results and handoffs. Unverified diagnostic contents are withheld.
        </p>
        {timeline.length ? (
          <ol className="mt-5 border-l border-border">
            {timeline.map((item, i) => (
              <li
                key={`${item.type}-${item.at}-${i}`}
                className="relative pb-6 pl-5 last:pb-0"
              >
                <span className="absolute -left-1.25 top-1 size-2.5 rounded-full bg-accent ring-4 ring-background" />
                <p className="mono-label text-muted-foreground">
                  {dateLabel(item.at)} · {item.type}
                  {item.by ? ` · ${item.by}` : ""}
                </p>
                <p className="mt-1 text-sm font-medium">{item.title}</p>
                {item.detail && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.detail}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No clinical events have been recorded for this visit.
          </p>
        )}
      </div>
    </section>
  );
}
