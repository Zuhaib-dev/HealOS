"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  closeEmergencyAdmissionApi,
  createEmergencyAdmissionApi,
  fetchEmergencyAdmissionApi,
  type EmergencyAdmissionData,
  type EmergencyCaseData,
  type EmergencyWardData,
} from "@/lib/api/emergency";
import { useAuthStore } from "@/store/use-auth-store";

export function EmergencyAdmissionPanel({ caseId }: { caseId: string }) {
  const [emergencyCase, setEmergencyCase] = useState<EmergencyCaseData | null>(
    null,
  );
  const [admission, setAdmission] = useState<EmergencyAdmissionData | null>(
    null,
  );
  const [wards, setWards] = useState<EmergencyWardData[]>([]);
  const [wardId, setWardId] = useState("");
  const [reason, setReason] = useState("");
  const [dischargeNote, setDischargeNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const canAdmit = ["ADMIN", "DOCTOR", "EMERGENCY_DOCTOR"].includes(
    currentUser?.role || "",
  );
  const canClose = ["ADMIN", "DOCTOR", "EMERGENCY_DOCTOR", "NURSE"].includes(
    currentUser?.role || "",
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetchEmergencyAdmissionApi(caseId);
      setEmergencyCase(response.case);
      setAdmission(response.admission);
      setWards(response.wards);
      setWardId(
        (current) =>
          current ||
          response.wards.find((ward) => ward.available > 0)?._id ||
          "",
      );
    } catch (cause: any) {
      setError(
        cause?.response?.data?.message ||
          "Unable to load ward admission handoff.",
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const admit = async (event: FormEvent) => {
    event.preventDefault();
    if (!wardId || reason.trim().length < 3) return;
    setWorking(true);
    setError(null);
    try {
      const response = await createEmergencyAdmissionApi(caseId, {
        wardId,
        reason: reason.trim(),
      });
      setAdmission(response.admission);
      setEmergencyCase(response.case);
      await load();
    } catch (cause: any) {
      setError(
        cause?.response?.data?.message || "Unable to admit this ED case.",
      );
    } finally {
      setWorking(false);
    }
  };

  const close = async () => {
    setWorking(true);
    setError(null);
    try {
      const response = await closeEmergencyAdmissionApi(
        caseId,
        dischargeNote.trim(),
      );
      setAdmission(response.admission);
      setEmergencyCase(response.case);
      await load();
    } catch (cause: any) {
      setError(
        cause?.response?.data?.message ||
          "Unable to close this inpatient handoff.",
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading)
    return (
      <div
        role="status"
        className="p-12 text-center mono-label text-muted-foreground animate-pulse"
      >
        Loading ward capacity…
      </div>
    );
  if (!emergencyCase)
    return (
      <div
        role="alert"
        className="hairline bg-background p-8 text-sm text-destructive"
      >
        {error || "Emergency case not found."}
      </div>
    );
  const ward =
    admission?.ward && typeof admission.ward === "object"
      ? admission.ward
      : null;

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
        index="04 / inpatient handoff"
        title={`${emergencyCase.id} · ${emergencyCase.patient}`}
        note={`${emergencyCase.age}${emergencyCase.sex} · ESI ${emergencyCase.esi} · ${emergencyCase.complaint}`}
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
      {admission ? (
        <section className="bg-background p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mono-label text-xs text-accent">
                WARD ADMISSION · {admission.status}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                {ward?.name || "Ward"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ward?.department} · {ward?.code} ·{" "}
                {ward
                  ? `${ward.currentOccupancy}/${ward.capacity} occupied`
                  : "Ward record unavailable"}
              </p>
            </div>
            <p className="mono-label text-xs text-muted-foreground">
              Admitted {new Date(admission.admittedAt).toLocaleString()}
            </p>
          </div>
          <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <div>
              <dt className="mono-label text-xs text-muted-foreground">
                Diagnosis
              </dt>
              <dd className="mt-1 text-sm">{admission.diagnosis}</dd>
            </div>
            <div>
              <dt className="mono-label text-xs text-muted-foreground">
                Admission reason
              </dt>
              <dd className="mt-1 text-sm">{admission.reason}</dd>
            </div>
          </dl>
          {admission.status === "ACTIVE" && canClose && (
            <div className="mt-6 border-t border-border pt-5">
              <label className="block">
                <span className="mono-label text-xs text-muted-foreground">
                  Discharge note
                </span>
                <textarea
                  maxLength={1000}
                  minLength={3}
                  required
                  value={dischargeNote}
                  onChange={(event) => setDischargeNote(event.target.value)}
                  rows={3}
                  className="hairline mt-1 w-full bg-foreground/2 p-3 text-sm"
                  placeholder="Record the handoff/discharge note"
                />
              </label>
              <ActionButton
                onClick={() => void close()}
                disabled={working || dischargeNote.trim().length < 3}
                className="mt-3"
              >
                {working
                  ? "Closing…"
                  : "Close admission and release ward capacity"}
              </ActionButton>
            </div>
          )}
          {admission.status !== "ACTIVE" && (
            <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
              Admission closed{" "}
              {admission.dischargedAt
                ? new Date(admission.dischargedAt).toLocaleString()
                : ""}
              . Ward capacity has been released.
            </p>
          )}
        </section>
      ) : (
        <form
          onSubmit={admit}
          className="grid gap-px lg:grid-cols-[1.2fr_0.8fr]"
        >
          <section className="bg-background p-5 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  Choose an accepting ward
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only wards with recorded spare capacity can accept this case.
                </p>
              </div>
              <span className="mono-label text-xs text-muted-foreground">
                {wards.filter((item) => item.available > 0).length} available
              </span>
            </div>
            {wards.length === 0 ? (
              <p className="hairline mt-5 bg-foreground/2 p-5 text-sm text-muted-foreground">
                No wards are configured. Ask an administrator to add ward
                capacity first.
              </p>
            ) : (
              <div className="mt-5 space-y-px bg-border">
                {wards.map((item) => (
                  <label
                    key={item._id}
                    className={`flex cursor-pointer items-start gap-3 bg-background p-4 ${item.available === 0 ? "opacity-50" : "hover:bg-foreground/3"}`}
                  >
                    <input
                      type="radio"
                      name="ward"
                      value={item._id}
                      checked={wardId === item._id}
                      disabled={item.available === 0 || !canAdmit}
                      onChange={() => setWardId(item._id)}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong>{item.name}</strong>
                        <span className="mono-label text-xs">
                          {item.available} available · {item.currentOccupancy}/
                          {item.capacity}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.department} · {item.code}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Ward capacity is recorded at ward level. This system does not yet
              assign a specific bed number.
            </p>
          </section>
          <aside className="space-y-px">
            <section className="bg-background p-5 sm:p-8">
              <h2 className="font-display text-lg font-semibold">
                Admission handoff
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="mono-label text-xs text-muted-foreground">
                    ED diagnosis
                  </dt>
                  <dd className="mt-1">
                    {emergencyCase.diagnosisSummary || "No signed diagnosis"}
                  </dd>
                </div>
                <div>
                  <dt className="mono-label text-xs text-muted-foreground">
                    Presenting complaint
                  </dt>
                  <dd className="mt-1">{emergencyCase.complaint}</dd>
                </div>
              </dl>
              <label className="mt-5 block">
                <span className="mono-label text-xs text-muted-foreground">
                  Reason for admission
                </span>
                <textarea
                  required
                  minLength={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  disabled={!canAdmit}
                  className="hairline mt-1 w-full bg-foreground/2 p-3 text-sm"
                  placeholder="Clinical reason and accepting service"
                />
              </label>
              {!canAdmit ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  The assigned doctor or an administrator must initiate ward
                  admission.
                </p>
              ) : (
                <ActionButton
                  type="submit"
                  tone="solid"
                  disabled={working || !wardId}
                  className="mt-4 w-full"
                >
                  {working ? "Reserving capacity…" : "Confirm ward admission"}
                </ActionButton>
              )}
            </section>
          </aside>
        </form>
      )}
    </section>
  );
}
