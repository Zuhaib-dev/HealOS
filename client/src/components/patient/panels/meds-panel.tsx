"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PatientHeader } from "@/components/patient/patient-header";
import { toast } from "sonner";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "mute";
}) {
  const map = {
    ok: "bg-accent/12 text-brass",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return (
    <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>
  );
}

export function MedsPanel() {
  const { data, isLoading } = usePatientDashboard();

  const parseDurationDays = (dur: string) => {
    if (!dur) return 30;
    const num = parseInt(dur.replace(/[^0-9]/g, ""));
    if (isNaN(num)) return 30;
    if (dur.toLowerCase().includes("week")) return num * 7;
    if (dur.toLowerCase().includes("month")) return num * 30;
    return num;
  };

  const allMeds = (data?.consultations || []).flatMap((c) =>
    (c.medicines || []).map((m, idx: number) => {
      const createdAt = new Date(c.createdAt);
      const durationDays = parseDurationDays(m.duration);
      const expiryDate = new Date(createdAt);
      expiryDate.setDate(createdAt.getDate() + durationDays);
      const isActive = new Date() <= expiryDate;

      return {
        id: `${c._id}-${idx}`,
        name: m.name,
        dose: m.dosage,
        freq: m.frequency,
        started: createdAt.toLocaleDateString(),
        prescriber: c.doctor?.name ? `Dr. ${c.doctor.name}` : "Doctor",
        state: isActive ? "active" : "inactive",
        instructions: m.instructions,
      };
    }),
  );

  const activeMeds = allMeds.filter((m) => m.state === "active");
  const [takenMeds, setTakenMeds] = useState<Record<string, boolean>>({});
  const todayKey = new Date().toLocaleDateString();

  useEffect(() => {
    const saved = localStorage.getItem(`meds_taken_${todayKey}`);
    if (saved) {
      try {
        setTakenMeds(JSON.parse(saved));
      } catch {
        /* ignore corrupt local storage */
      }
    }
  }, [todayKey]);

  const toggleTaken = (id: string) => {
    const next = { ...takenMeds, [id]: !takenMeds[id] };
    setTakenMeds(next);
    localStorage.setItem(`meds_taken_${todayKey}`, JSON.stringify(next));
    if (next[id]) toast.success("Marked as taken");
  };

  return (
    <section className="pb-24 lg:pb-12">
      <PatientHeader
        title="Medications"
        note="Today's doses and the prescriptions still on your chart."
      />

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <h2 className="mb-3 font-display text-sm font-bold">Today</h2>
        {isLoading ? (
          <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse bg-foreground/4" />
            ))}
          </div>
        ) : activeMeds.length === 0 ? (
          <p className="border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No active medications scheduled for today.
          </p>
        ) : (
          <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
            {activeMeds.map((m) => {
              const isTaken = !!takenMeds[m.id];
              return (
                <div key={m.id} className="bg-background p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className={`font-display text-base font-bold ${
                          isTaken
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {m.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {m.dose} · {m.freq}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTaken(m.id)}
                      aria-label={
                        isTaken
                          ? `Mark ${m.name} as not taken`
                          : `Mark ${m.name} as taken`
                      }
                      className={`grid size-8 shrink-0 place-items-center border transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
                        isTaken
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border text-transparent hover:border-accent hover:text-accent/40"
                      }`}
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {m.instructions ? (
                    <p className="mt-3 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Instructions:{" "}
                      </span>
                      {m.instructions}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <h2 className="mt-8 mb-3 font-display text-sm font-bold">
          Prescription history
        </h2>
        <div className="flex flex-col gap-px bg-border/60">
          {allMeds.length === 0 ? (
            <div className="bg-background px-5 py-8 text-center text-sm text-muted-foreground">
              No medications found.
            </div>
          ) : (
            allMeds.map((m) => (
              <div
                key={m.id}
                className={`flex flex-wrap items-center gap-4 bg-background px-5 py-4 sm:px-6 ${
                  m.state === "inactive" ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="mono-label mt-1 text-[11px] text-muted-foreground">
                    {m.dose} · {m.freq} · prescribed {m.started} ·{" "}
                    {m.prescriber}
                  </p>
                </div>
                <Pill tone={m.state === "active" ? "ok" : "mute"}>
                  {m.state.toUpperCase()}
                </Pill>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
