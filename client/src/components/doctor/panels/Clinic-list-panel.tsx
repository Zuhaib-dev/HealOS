"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  Search,
  SlidersHorizontal,
  CalendarDays,
  RefreshCw,
  UserRound,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import {
  updateAppointmentStatusApi,
  AppointmentRecord,
  fetchDoctorAppointmentsApi,
} from "@/lib/api/appointment";
import { toast } from "sonner";
import { ConsultationForm } from "@/components/doctor/shared/consultation-form";
import { getSocket } from "@/lib/socket";
import { formatTimeRange } from "@/lib/time-format";
import { QueueRadar } from "./queue-radar";
import { NeonTimeline } from "./neon-timeline";

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

/* ---------- 03 · Clinic list ---------- */

export function ClinicPanel() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeConsultation, setActiveConsultation] =
    useState<AppointmentRecord | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(searchTerm.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const loadAppointments = useCallback(
    async (currentPage: number = 1) => {
      try {
        setLoading(true);
        setLoadError(false);
        const res = await fetchDoctorAppointmentsApi(currentPage, 10, {
          search: debouncedSearch,
          status: statusFilter,
          period: periodFilter,
        });
        if (res.success && res.appointments) {
          setAppointments(res.appointments);
          setTotalPages(res.totalPages || 1);
          setTotalCount(res.totalCount || 0);
          setPage(currentPage);
        }
      } catch (err) {
        console.error("Failed to load doctor appointments", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, periodFilter],
  );

  useEffect(() => {
    loadAppointments(page);
    const socket = getSocket();
    const handleUpdate = () => loadAppointments(page);
    const handleCreate = () => loadAppointments(1);
    socket.on("appointment_updated", handleUpdate);
    socket.on("appointment_created", handleCreate);
    return () => {
      socket.off("appointment_updated", handleUpdate);
      socket.off("appointment_created", handleCreate);
    };
  }, [loadAppointments, page]);

  const activeFilters = [
    searchTerm,
    statusFilter !== "ALL",
    periodFilter !== "ALL",
  ].filter(Boolean).length;

  const handleUpdateStatus = async (
    id: string,
    status: "CONFIRMED" | "COMPLETED" | "CANCELLED",
  ) => {
    if (status === "COMPLETED") {
      setActiveConsultation(appointments.find((a) => a._id === id) || null);
      return;
    }

    try {
      setBusyId(id);
      const res = await updateAppointmentStatusApi(id, status);
      if (res.success) {
        toast.success(`Appointment marked as ${status}`);
        loadAppointments(page);
      }
    } catch {
      toast.error("Failed to update appointment status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative pb-24">
      <AnimatePresence>
        {activeConsultation && (
          <ConsultationForm
            key="consultation-form"
            appointment={activeConsultation}
            onBack={() => setActiveConsultation(null)}
            onComplete={() => {
              setActiveConsultation(null);
              loadAppointments(page);
            }}
          />
        )}
      </AnimatePresence>
      <DoctorHeader
        title="Clinic"
        note="Search, confirm, and start visits. Newest bookings first."
        actions={
          <ActionButton tone="solid" onClick={() => loadAppointments(page)}>
            <RefreshCw className="mr-2 size-3.5" /> Refresh
          </ActionButton>
        }
      />

      <section className="border-b border-border/60 bg-background p-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Find appointments</h2>
          {activeFilters > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {activeFilters} active
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_190px_auto]">
          <label className="relative block">
            <span className="sr-only">Search patients and visit reasons</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Patient name, phone, or reason"
              className="w-full border border-border/70 bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Filter by status</span>
            <CheckCircle2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full appearance-none border border-border/70 bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Filter by appointment date</span>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={periodFilter}
              onChange={(event) => {
                setPeriodFilter(event.target.value);
                setPage(1);
              }}
              className="w-full appearance-none border border-border/70 bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value="ALL">All dates</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="PAST">Past appointments</option>
            </select>
          </label>
          <button
            type="button"
            disabled={activeFilters === 0}
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setPeriodFilter("ALL");
              setPage(1);
            }}
            className="min-h-10 border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear filters
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Updating list…"
              : `${totalCount} appointment${totalCount === 1 ? "" : "s"} found`}
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock3 className="size-3.5" /> Newest bookings first
          </p>
        </div>
      </section>

      {/* Dashboard Visualizations */}
      {!loading && appointments.length > 0 && (
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <QueueRadar appointments={appointments} />
            </div>
            <div className="xl:col-span-2 flex items-center">
              <NeonTimeline appointments={appointments} />
            </div>
          </div>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 sm:mx-6 lg:mx-8"
        >
          <p className="text-sm text-destructive">
            Couldn’t load the appointment list. Check your connection and try
            again.
          </p>
          <button
            type="button"
            onClick={() => loadAppointments(page)}
            className="rounded-md border border-destructive/25 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col gap-px bg-border/60 pb-4 xl:hidden">
        {loading ? (
          <div className="bg-background p-8 text-center text-sm text-muted-foreground">
            Loading appointments…
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-background p-8 text-center">
            <p className="font-medium">No matching appointments</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing a filter or searching for another patient.
            </p>
          </div>
        ) : (
          appointments.map((appointment) => {
            const patient =
              typeof appointment.patient === "object"
                ? appointment.patient
                : null;
            const tone =
              appointment.status === "PENDING"
                ? "warn"
                : appointment.status === "CONFIRMED"
                  ? "ok"
                  : appointment.status === "CANCELLED"
                    ? "bad"
                    : "mute";
            const isBusy = busyId === appointment._id;
            return (
              <article key={appointment._id} className="bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary">
                      <UserRound className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">
                        {patient?.name || "Patient"}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {patient?.phone ||
                          patient?.email ||
                          "Contact details unavailable"}
                      </p>
                    </div>
                  </div>
                  <Pill tone={tone}>{appointment.status}</Pill>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border/50 py-3 text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">
                    {appointment.date}
                  </span>
                  <span>
                    {formatTimeRange(
                      appointment.timeSlot,
                      appointment.slotEndTime,
                    )}
                  </span>
                  {appointment.queueNumber && (
                    <span className="font-semibold text-primary">
                      Queue #{String(appointment.queueNumber).padStart(2, "0")}
                    </span>
                  )}
                  <span>{appointment.department}</span>
                  <span>
                    {appointment.type === "TELECONSULT"
                      ? "Video visit"
                      : "In person"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed">
                  {appointment.reason}
                </p>
                {appointment.notes && (
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    Note: {appointment.notes}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {appointment.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateStatus(appointment._id, "CONFIRMED")
                        }
                        className="min-h-10 bg-foreground px-3.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
                      >
                        {isBusy ? "Saving…" : "Confirm visit"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateStatus(appointment._id, "CANCELLED")
                        }
                        className="min-h-10 border border-border px-3.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {appointment.status === "CONFIRMED" && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        handleUpdateStatus(appointment._id, "COMPLETED")
                      }
                      className="min-h-10 bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      Start consultation
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto border-t border-border/50 xl:block">
        <table className="w-full min-w-180">
          <thead className="hairline-b">
            <tr>
              <Th>Date & Time</Th>
              <Th>Patient</Th>
              <Th>Department</Th>
              <Th>Reason / Symptoms</Th>
              <Th>Visit Type</Th>
              <Th>Status & Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse"
                >
                  Loading clinical schedule...
                </td>
              </tr>
            ) : appointments.length > 0 ? (
              appointments.map((a) => {
                const pat = typeof a.patient === "object" ? a.patient : null;
                const isBusy = busyId === a._id;

                return (
                  <tr key={a._id} className="hairline-b">
                    <Td>
                      <span className="mono-label font-bold text-brass">
                        {a.date}
                      </span>
                      <p className="mono-label text-muted-foreground text-xs">
                        {formatTimeRange(a.timeSlot, a.slotEndTime)}
                      </p>
                      {a.queueNumber && (
                        <p className="mono-label text-primary text-xs font-semibold">
                          Queue #{String(a.queueNumber).padStart(2, "0")}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <span className="font-medium text-foreground">
                        {pat?.name || "Patient"}
                      </span>
                      <p className="mono-label text-muted-foreground text-[11px]">
                        {pat?.phone || pat?.email}
                      </p>
                    </Td>
                    <Td>
                      <span className="mono-label font-semibold">
                        {a.department}
                      </span>
                    </Td>
                    <Td>
                      <p className="text-sm font-medium">{a.reason}</p>
                      {a.notes && (
                        <p className="text-xs text-emerald-500 font-mono mt-0.5">
                          Note: {a.notes}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">
                        {a.type}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {a.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateStatus(a._id, "CONFIRMED")
                              }
                              className="hairline mono-label bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2.5 py-1 text-xs rounded hover:opacity-80"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateStatus(a._id, "CANCELLED")
                              }
                              className="hairline mono-label text-destructive px-2 py-1 text-xs rounded hover:bg-destructive/10"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {a.status === "CONFIRMED" && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateStatus(a._id, "COMPLETED")
                              }
                              className="hairline mono-label bg-primary/15 text-primary border-primary/30 px-2.5 py-1 text-xs rounded font-bold hover:opacity-80"
                            >
                              Mark Completed
                            </button>
                          </>
                        )}

                        {a.status === "COMPLETED" && (
                          <Pill tone="ok">COMPLETED</Pill>
                        )}

                        {a.status === "CANCELLED" && (
                          <Pill tone="bad">CANCELLED</Pill>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center mono-label text-xs text-muted-foreground"
                >
                  No appointments scheduled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-border/40 bg-background">
          <p className="mono-label text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => loadAppointments(page - 1)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/60 hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => loadAppointments(page + 1)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/60 hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
