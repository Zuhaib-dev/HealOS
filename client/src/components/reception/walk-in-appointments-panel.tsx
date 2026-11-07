"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { ReceptionHeader } from "@/components/reception/reception-header";
import { ActionButton } from "@/components/admin/admin-shell";
import {
  fetchWalkInAppointmentsApi,
  type AppointmentRecord,
} from "@/lib/api/reception";
import { updateAppointmentStatusApi } from "@/lib/api/appointment";
import { formatTime12Hour } from "@/lib/time-format";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/use-auth-store";

const clinicToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function WalkInAppointmentsPanel() {
  const { user } = useAuthStore();
  const [date, setDate] = useState(clinicToday);
  const [query, setQuery] = useState("");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAppointments = useCallback(() => {
    setLoading(true);
    fetchWalkInAppointmentsApi(date)
      .then((response) => setAppointments(response.appointments || []))
      .catch((error) => {
        toast.error(
          error.response?.data?.message ||
            "Could not load walk-in appointments",
        );
      })
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    loadAppointments();
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => loadAppointments();
    socket.on("appointment_created", refresh);
    socket.on("appointment_updated", refresh);
    socket.on("reception:token_created", refresh);
    return () => {
      socket.off("appointment_created", refresh);
      socket.off("appointment_updated", refresh);
      socket.off("reception:token_created", refresh);
    };
  }, [loadAppointments]);

  const visibleAppointments = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return appointments;
    return appointments.filter((appointment) =>
      [
        appointment.patient?.name,
        appointment.patient?.phone,
        appointment.queueToken,
        appointment.department,
        appointment.doctor?.name,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [appointments, query]);

  const advanceStatus = async (appointment: AppointmentRecord) => {
    const nextStatus =
      appointment.status === "IN_PROGRESS" ? "COMPLETED" : "IN_PROGRESS";
    setBusyId(appointment._id);
    try {
      await updateAppointmentStatusApi(appointment._id, nextStatus);
      toast.success(
        nextStatus === "COMPLETED"
          ? "Walk-in visit completed"
          : "Patient called into consultation",
      );
      loadAppointments();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Could not update appointment",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <ReceptionHeader
        title="Walk-in appointments"
        note="Find and manage reception-created visits by patient, token, department, or doctor."
        actions={
          <ActionButton onClick={loadAppointments} disabled={loading}>
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ActionButton>
        }
      />

      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <label className="flex items-center gap-2 border border-border/60 px-3 py-2 sm:w-64">
          <Search className="size-4 text-muted-foreground" />
          <input
            aria-label="Search walk-in appointments"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Patient, token, doctor…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Visit date
          <input
            aria-label="Walk-in visit date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="ml-2 border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <span className="mono-label text-muted-foreground">
          {visibleAppointments.length} visit
          {visibleAppointments.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-px bg-border/60 p-px md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="bg-background p-10 text-sm text-muted-foreground">
            Loading walk-in records…
          </p>
        ) : visibleAppointments.length === 0 ? (
          <p className="bg-background p-10 text-sm text-muted-foreground">
            {query
              ? "No walk-in appointments match that search."
              : "No walk-in appointments for this date."}
          </p>
        ) : (
          visibleAppointments.map((appointment) => {
            const terminal = ["COMPLETED", "CANCELLED"].includes(
              appointment.status,
            );
            return (
              <article
                key={appointment._id}
                className="bg-background p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mono-label text-primary">
                      {appointment.queueToken ||
                        `Walk-in · ${appointment._id.slice(-5).toUpperCase()}`}
                    </p>
                    <h2 className="mt-2 truncate font-display text-lg font-semibold">
                      {appointment.patient?.name || "Unnamed patient"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {appointment.patient?.phone || "No phone on file"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                    {appointment.status.replaceAll("_", " ")}
                  </span>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Department
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {appointment.department}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Assigned doctor
                    </dt>
                    <dd className="mt-0.5 truncate font-medium">
                      {appointment.doctor?.name || "Unassigned"}
                    </dd>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    {formatTime12Hour(appointment.timeSlot)}
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">
                      Reason for visit
                    </dt>
                    <dd className="mt-0.5 line-clamp-2 font-medium">
                      {appointment.reason}
                    </dd>
                  </div>
                </dl>
                {!terminal && user?.role !== "ADMIN" ? (
                  <ActionButton
                    className="mt-5 w-full justify-center"
                    disabled={busyId === appointment._id}
                    onClick={() => void advanceStatus(appointment)}
                  >
                    <Check className="size-3.5" />
                    {busyId === appointment._id
                      ? "Updating…"
                      : appointment.status === "IN_PROGRESS"
                        ? "Complete visit"
                        : "Call patient"}
                  </ActionButton>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
