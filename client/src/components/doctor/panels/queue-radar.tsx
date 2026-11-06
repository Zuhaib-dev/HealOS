"use client";

import { AppointmentRecord } from "@/lib/api/appointment";
import { useMemo } from "react";
import { formatTimeRange } from "@/lib/time-format";

export function QueueRadar({
  appointments,
}: {
  appointments: AppointmentRecord[];
}) {
  const upcoming = useMemo(() => {
    return appointments.filter(
      (a) => a.status === "PENDING" || a.status === "CONFIRMED",
    );
  }, [appointments]);

  return (
    <div className="border border-border/60 bg-background">
      <p className="border-b border-border/40 px-4 py-3 font-display text-sm font-bold">
        Next up
      </p>
      {upcoming.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          No pending or confirmed visits on this page.
        </p>
      ) : (
        upcoming.slice(0, 6).map((appt) => {
          const pat =
            typeof appt.patient === "object" && appt.patient
              ? appt.patient
              : null;
          return (
            <div
              key={appt._id}
              className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {pat?.name || "Patient"}
                </p>
                <p className="mono-label text-[10px] text-muted-foreground">
                  {formatTimeRange(appt.timeSlot, appt.slotEndTime)}
                </p>
              </div>
              <span className="mono-label shrink-0 text-[10px] text-muted-foreground">
                {appt.status}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
