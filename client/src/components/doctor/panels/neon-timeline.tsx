"use client";

import { AppointmentRecord } from "@/lib/api/appointment";
import { useMemo } from "react";
import { formatTimeRange } from "@/lib/time-format";

export function NeonTimeline({
  appointments,
}: {
  appointments: AppointmentRecord[];
}) {
  const sorted = useMemo(() => {
    return appointments
      .filter((a) => a.status === "PENDING" || a.status === "CONFIRMED")
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [appointments]);

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center border border-border/60 bg-background">
        <p className="text-sm text-muted-foreground">No visits on this page.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border/60 bg-background">
      <p className="border-b border-border/40 px-4 py-3 font-display text-sm font-bold">
        Today’s times
      </p>
      <ol className="flex min-w-min gap-0">
        {sorted.map((appt) => {
          const pat =
            typeof appt.patient === "object" && appt.patient
              ? appt.patient
              : null;
          return (
            <li
              key={appt._id}
              className="min-w-36 shrink-0 border-r border-border/40 px-4 py-5 last:border-r-0"
            >
              <p className="mono-label text-[10px] text-muted-foreground">
                {formatTimeRange(appt.timeSlot, appt.slotEndTime)}
              </p>
              <p className="mt-2 truncate text-sm font-semibold">
                {pat?.name || "Patient"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {appt.type === "TELECONSULT" ? "Video" : "In person"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
