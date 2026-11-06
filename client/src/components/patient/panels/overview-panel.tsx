"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * audience: patients · use: see next visit, book, read own record
 */

import { useState } from "react";
import {
  TriangleAlert,
  Activity,
  Loader2,
  Calendar,
  CalendarClock,
  Pill,
  ShieldCheck,
  X,
  ChevronRight,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";
import { formatTime12Hour, formatTimeRange } from "@/lib/time-format";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { PatientSkeleton } from "@/components/patient/patient-skeleton";

export function OverviewPanel() {
  const { user } = useAuthStore();
  const { data, isLoading, error } = usePatientDashboard();
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  if (isLoading) {
    return <PatientSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="px-4 py-16 text-center text-sm text-destructive">
        Could not load your record. Try again in a moment.
      </div>
    );
  }

  const profile = data.profile;
  const userName = user?.name || "Patient";
  const firstName = userName.split(" ")[0];
  const bloodGroup = profile?.bloodGroup || "—";
  const allergies = profile?.allergies?.filter(Boolean) ?? [];

  const conditions = Array.from(
    new Set(
      data.consultations.map((c) => c.diagnosis).filter(Boolean) as string[],
    ),
  );

  const latestVitals = data.vitals?.[0];
  const bmi =
    profile?.height && profile?.weight
      ? (
          profile.weight /
          Math.pow(
            profile.heightUnit === "ft"
              ? profile.height * 0.3048
              : profile.height / 100,
            2,
          )
        ).toFixed(1)
      : "—";

  const upcomingAppointments =
    data.appointments
      ?.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED")
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ) || [];

  const activeMedicines =
    data.consultations
      ?.flatMap((c) => c.medicines || [])
      .filter((m) => !m.isDispensed) || [];

  const nextFollowUp = data.consultations
    ?.filter((c) => c.followUpDate && new Date(c.followUpDate) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.followUpDate!).getTime() -
        new Date(b.followUpDate!).getTime(),
    )[0];

  const nextVisit = upcomingAppointments[0];

  const handleGenerateSummary = async () => {
    if (!data.vitals?.length) {
      toast.error("No recorded vitals to summarise yet.");
      return;
    }
    setIsVitalsModalOpen(true);
    setAiSummary("");
    setIsGeneratingSummary(true);
    try {
      const token = useAuthStore.getState().token;
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/ai/vitals-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vitals: data.vitals, profile: data.profile }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAiSummary(json.summary);
      } else {
        throw new Error(json.message || "Failed to generate health summary");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
      setIsVitalsModalOpen(false);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const careTeam = Array.from(
    new Map(data.consultations.map((c) => [c.doctor.name, c.doctor])).values(),
  ).slice(0, 4);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-350 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-accent" />
              Patient
            </span>
            {profile?.dob ? (
              <span>· Born {new Date(profile.dob).toLocaleDateString()}</span>
            ) : null}
          </p>
        </div>
        <Link
          href="/patient/book"
          prefetch
          className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Book a visit <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {nextFollowUp ? (
        <div className="mb-4 flex items-start gap-3 border border-border/60 bg-card/40 p-4">
          <Calendar className="mt-0.5 size-4 shrink-0 text-accent" />
          <p className="min-w-0 text-sm">
            Follow-up on{" "}
            <span className="font-semibold">
              {new Date(nextFollowUp.followUpDate!).toLocaleDateString()}
            </span>
            {nextFollowUp.diagnosis ? ` for ${nextFollowUp.diagnosis}` : ""}.
            Walk in that day — no new booking needed.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-px bg-border/60 lg:grid-cols-4">
        <div className="bg-background p-4 sm:p-5">
          <p className="mono-label text-[10px] text-muted-foreground uppercase">
            Blood
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{bloodGroup}</p>
        </div>
        <div className="bg-background p-4 sm:p-5">
          <p className="mono-label text-[10px] text-muted-foreground uppercase">
            BMI
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{bmi}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile?.height
              ? `${profile.height} ${profile.heightUnit || ""}`
              : "—"}
            {profile?.weight ? ` · ${profile.weight} kg` : ""}
          </p>
        </div>
        <div className="bg-background p-4 sm:p-5">
          <p className="mono-label text-[10px] text-muted-foreground uppercase">
            Heart rate
          </p>
          <p className="mt-1 font-display text-2xl font-bold">
            {latestVitals?.heartRate ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latestVitals ? "Last recorded" : "Not recorded yet"}
          </p>
        </div>
        <div className="bg-background p-4 sm:p-5">
          <p className="mono-label text-[10px] text-muted-foreground uppercase">
            BP
          </p>
          <p className="mt-1 font-display text-2xl font-bold">
            {latestVitals?.bloodPressure || "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-px bg-border/60 lg:grid-cols-2">
        <article className="min-w-0 bg-background p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-display text-sm font-bold">
              <CalendarClock className="size-4 text-accent" />
              Next visit
            </h2>
            <Link
              href="/patient/appointments"
              prefetch
              className="text-xs text-muted-foreground hover:text-accent"
            >
              All visits
            </Link>
          </div>
          {nextVisit ? (
            <div>
              <p className="font-semibold">Dr. {nextVisit.doctor.name}</p>
              <p className="text-sm text-muted-foreground">
                {nextVisit.department}
              </p>
              <p className="mt-2 font-mono text-sm">
                {new Date(nextVisit.date).toLocaleDateString()} · Arrive{" "}
                {formatTime12Hour(nextVisit.arrivalTime || nextVisit.timeSlot)}
              </p>
              <p className="text-xs text-muted-foreground">
                Visit{" "}
                {formatTimeRange(nextVisit.timeSlot, nextVisit.slotEndTime)}
                {nextVisit.queueNumber
                  ? ` · Queue #${String(nextVisit.queueNumber).padStart(2, "0")}`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming visit.{" "}
              <Link
                href="/patient/book"
                className="text-accent hover:underline"
              >
                Book one
              </Link>
            </p>
          )}
        </article>

        <article className="min-w-0 bg-background p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-display text-sm font-bold">
              <Pill className="size-4 text-accent" />
              Medicines
            </h2>
            <Link
              href="/patient/meds"
              prefetch
              className="text-xs text-muted-foreground hover:text-accent"
            >
              Meds
            </Link>
          </div>
          {activeMedicines.length > 0 ? (
            <ul className="space-y-2">
              {activeMedicines.slice(0, 4).map((med, idx) => (
                <li key={`${med.name}-${idx}`} className="text-sm">
                  <span className="font-medium">{med.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {med.dosage} · {med.frequency}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active prescriptions.
            </p>
          )}
        </article>

        <article className="min-w-0 bg-background p-4 sm:p-5">
          <h2 className="mb-3 inline-flex items-center gap-2 font-display text-sm font-bold">
            <Activity className="size-4 text-accent" />
            Conditions
          </h2>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {conditions.map((c) => (
                <span
                  key={c}
                  className="border border-border/60 px-2.5 py-1 text-xs"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No diagnoses on file yet.
            </p>
          )}
          <div className="mt-4 border-t border-border/40 pt-3">
            <p className="mono-label text-[10px] text-muted-foreground uppercase">
              Allergies
            </p>
            {allergies.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive"
                  >
                    <TriangleAlert className="size-3" />
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                None recorded
              </p>
            )}
          </div>
        </article>

        <article className="min-w-0 bg-background p-4 sm:p-5">
          <h2 className="mb-3 inline-flex items-center gap-2 font-display text-sm font-bold">
            <Users className="size-4 text-accent" />
            Care team
          </h2>
          {careTeam.length > 0 ? (
            <ul className="space-y-2">
              {careTeam.map((doctor) => (
                <li key={doctor.name} className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center bg-muted font-mono text-xs font-bold">
                    {doctor.name[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      Dr. {doctor.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {doctor.role}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your clinicians will appear after a visit.
            </p>
          )}
          {data.vitals?.length ? (
            <button
              type="button"
              onClick={() => void handleGenerateSummary()}
              className="mt-4 text-xs font-medium text-accent hover:underline"
            >
              Summarise latest vitals
            </button>
          ) : null}
        </article>
      </div>

      {isVitalsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close summary"
            onClick={() => setIsVitalsModalOpen(false)}
            className="absolute inset-0 bg-background/80"
          />
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <h2 className="font-display text-lg font-bold">Vitals summary</h2>
              <button
                type="button"
                onClick={() => setIsVitalsModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="mb-3 size-6 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">
                    Reading your vitals history…
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
              )}
            </div>
            <p className="border-t border-border/60 px-5 py-3 text-center text-xs text-muted-foreground">
              Informational only. Confirm anything important with your doctor.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
