"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  TriangleAlert,
  PenLine,
  Send,
  X,
  CheckCircle2,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import {
  fetchDoctorAppointmentsApi,
  updateAppointmentStatusApi,
  AppointmentRecord,
} from "@/lib/api/appointment";
import { toast } from "sonner";
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import { getScheduleApi } from "@/lib/api/doctor";
import { getSocket } from "@/lib/socket";

/* ---------- primitives ---------- */

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return (
    <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

/** Animated vitals sparkline — drawn, never an image. */
function Vitals({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 30 - ((v - min) / Math.max(1, max - min)) * 26 - 2;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="h-8 w-24 shrink-0"
    >
      <motion.polyline
        points={pts}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

function acuityPill(a: "critical" | "guarded" | "stable") {
  return a === "critical" ? (
    <Pill tone="bad">critical</Pill>
  ) : a === "guarded" ? (
    <Pill tone="warn">guarded</Pill>
  ) : (
    <Pill tone="ok">stable</Pill>
  );
}

/* ---------- 08 · Rota ---------- */

export function RotaPanel() {
  const [scheduleList, setScheduleList] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = () =>
      getScheduleApi()
        .then((res) => {
          setScheduleList(res.data.schedule || []);
          setAvailability(res.data.availability || null);
          setAppointments(res.data.appointments || []);
        })
        .catch(() => toast.error("Failed to load schedule"))
        .finally(() => setLoading(false));
    refresh();
    const socket = getSocket();
    socket.on("appointment_created", refresh);
    socket.on("appointment_updated", refresh);
    socket.on("doctor_availability_updated", refresh);
    return () => {
      socket.off("appointment_created", refresh);
      socket.off("appointment_updated", refresh);
      socket.off("doctor_availability_updated", refresh);
    };
  }, []);

  return (
    <div>
      <PanelHeader
        index="08 / rota"
        title="My rota"
        note="Your weekly clinic pattern, as configured by the hospital scheduler, plus booked patients."
        actions={<ActionButton>Request change</ActionButton>}
      />
      <section className="mx-4 rounded-xl border border-border/60 bg-card p-5 sm:mx-8 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mono-label text-muted-foreground">
              Weekly clinic hours
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Your booking timetable
            </h2>
          </div>
          {availability ? (
            <Pill tone={availability.active ? "ok" : "mute"}>
              {availability.active ? "BOOKING OPEN" : "PAUSED"}
            </Pill>
          ) : null}
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading your rota…
          </p>
        ) : availability ? (
          <>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day, index) => {
                  const working = availability.weekdays?.includes(index);
                  return (
                    <div
                      key={day}
                      className={`rounded-lg border px-1 py-3 text-center ${working ? "border-accent/30 bg-accent/8" : "border-border/50 bg-muted/20"}`}
                    >
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground sm:text-xs">
                        {day}
                      </p>
                      <p
                        className={`mt-2 size-2 mx-auto rounded-full ${working ? "bg-accent" : "bg-border"}`}
                      />
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {working ? "Clinic" : "Off"}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mono-label text-muted-foreground">Hours</p>
                <p className="mt-1 font-mono font-semibold">
                  {availability.startTime}–{availability.endTime}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mono-label text-muted-foreground">Visit length</p>
                <p className="mt-1 font-mono font-semibold">
                  {availability.slotDurationMinutes} min
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mono-label text-muted-foreground">
                  Daily capacity
                </p>
                <p className="mt-1 font-mono font-semibold">
                  {availability.maxPatientsPerDay} patients
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mono-label text-muted-foreground">
                  Consultation fee
                </p>
                <p className="mt-1 font-mono font-semibold">
                  ₹{availability.consultationFee}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
            No weekly booking timetable has been configured yet. Contact the
            hospital scheduler.
          </p>
        )}
      </section>

      <section className="px-4 py-7 sm:px-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="mono-label text-muted-foreground">Live schedule</p>
            <h2 className="mt-1 text-lg font-semibold">Upcoming patients</h2>
          </div>
          <span className="mono-label text-muted-foreground">
            {appointments.length} booked
          </span>
        </div>
        {appointments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No patient appointments are booked in your upcoming rota.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[520px] text-left">
              <thead className="bg-muted/30">
                <tr>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Patient</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment._id}
                    className="border-t border-border/50"
                  >
                    <Td>
                      {new Date(
                        `${appointment.date}T00:00:00`,
                      ).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Td>
                    <Td>
                      <span className="font-mono">{appointment.timeSlot}</span>
                    </Td>
                    <Td>{appointment.patient?.name || "Patient"}</Td>
                    <Td>
                      <Pill
                        tone={
                          appointment.status === "COMPLETED" ? "ok" : "mute"
                        }
                      >
                        {appointment.status}
                      </Pill>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {scheduleList.length > 0 && (
        <section className="border-t border-border/60 px-4 py-6 sm:px-8">
          <p className="mono-label mb-3 text-muted-foreground">
            Dated staff shifts from admin
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {scheduleList.map((shift) => (
              <div
                key={shift._id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {new Date(`${shift.date}T00:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "short", month: "short", day: "numeric" },
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shift.department || "Clinic"} · {shift.shiftType}
                  </p>
                </div>
                <p className="font-mono text-sm">
                  {shift.startTime}–{shift.endTime}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
