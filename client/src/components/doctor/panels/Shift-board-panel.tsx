"use client";

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R4 V4
 * genre: modern-minimal · macrostructure: Split Studio
 * theme: Emerald Prestige · designed-as-app
 * audience: clinicians · use: see today's next visit and open consult
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { getDashboardStatsApi, getPatientHistoryApi } from "@/lib/api/doctor";
import { ConsultationForm } from "@/components/doctor/shared/consultation-form";
import { OpdReceiptModal } from "@/components/doctor/shared/opd-receipt-modal";
import { PatientChartDrawer } from "@/components/doctor/shared/patient-chart-drawer";
import { getSocket } from "@/lib/socket";
import {
  AppointmentRecord,
  fetchDoctorAppointmentsApi,
  updateAppointmentStatusApi,
} from "@/lib/api/appointment";
import { formatTimeRange } from "@/lib/time-format";
import { format } from "date-fns";

function clinicDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value || "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function ShiftPanel() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [patients, setPatients] = useState<any[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<any[]>([]);
  const [todayVisits, setTodayVisits] = useState<AppointmentRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [caseloadQuery, setCaseloadQuery] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRecord | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [showConsultation, setShowConsultation] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const loadStats = () => {
    getDashboardStatsApi()
      .then((res) => setStats(res.data))
      .catch(() => toast.error("Failed to load dashboard stats"))
      .finally(() => setLoading(false));
  };

  const loadToday = () => {
    const today = clinicDateKey();
    fetchDoctorAppointmentsApi(1, 80, { period: "UPCOMING" })
      .then((res) => {
        if (res.success && res.appointments) {
          setTodayVisits(
            res.appointments
              .filter(
                (a) =>
                  a.date === today &&
                  a.status !== "CANCELLED" &&
                  a.status !== "COMPLETED",
              )
              .sort((a, b) => {
                if (a.queueNumber && b.queueNumber)
                  return a.queueNumber - b.queueNumber;
                return String(a.timeSlot).localeCompare(String(b.timeSlot));
              }),
          );
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadStats();
    loadToday();
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    const socket = getSocket();
    if (socket) {
      socket.on("appointment_updated", loadStats);
      socket.on("appointment_created", loadStats);
      socket.on("appointment_updated", loadToday);
      socket.on("appointment_created", loadToday);
    }
    return () => {
      window.clearInterval(tick);
      if (socket) {
        socket.off("appointment_updated", loadStats);
        socket.off("appointment_created", loadStats);
        socket.off("appointment_updated", loadToday);
        socket.off("appointment_created", loadToday);
      }
    };
  }, []);

  useEffect(() => {
    import("@/lib/api/doctor").then(({ getAssignedPatientsApi }) => {
      getAssignedPatientsApi().then((res) => {
        setPatients(res.data.patients || []);
        setTodayFollowUps(res.data.todayFollowUps || []);
      });
    });
  }, []);

  const nextVisit = useMemo(() => {
    return (
      todayVisits.find(
        (a) => a.status === "CONFIRMED" || a.status === "IN_PROGRESS",
      ) || todayVisits.find((a) => a.status === "PENDING")
    );
  }, [todayVisits]);

  const openChart = async (patient: any, appointment?: AppointmentRecord) => {
    setSelectedPatient(patient);
    setSelectedAppointment(appointment || null);
    setHistoryLoading(true);
    try {
      const res = await getPatientHistoryApi(patient._id);
      if (res.status === "success") setHistoryData(res.data);
    } catch {
      toast.error("Failed to load patient history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      setBusyId(id);
      const res = await updateAppointmentStatusApi(id, "CONFIRMED");
      if (res.success) {
        toast.success("Visit confirmed");
        loadToday();
      }
    } catch {
      toast.error("Could not confirm this visit");
    } finally {
      setBusyId(null);
    }
  };

  const startConsult = (appointment?: AppointmentRecord, patient?: any) => {
    if (appointment) setSelectedAppointment(appointment);
    if (patient) setSelectedPatient(patient);
    setShowConsultation(true);
  };

  const nextPatient =
    nextVisit && typeof nextVisit.patient === "object"
      ? nextVisit.patient
      : null;

  const caseload = useMemo(() => {
    const q = caseloadQuery.trim().toLowerCase();
    const list = q
      ? patients.filter((p) => {
          const hay =
            `${p.name || ""} ${p.phone || ""} ${p.email || ""}`.toLowerCase();
          return hay.includes(q);
        })
      : patients;
    return [...list].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );
  }, [patients, caseloadQuery]);

  const todayPatientIds = useMemo(() => {
    return new Set(
      todayVisits.map((v) =>
        typeof v.patient === "object" ? v.patient?._id : v.patient,
      ),
    );
  }, [todayVisits]);

  return (
    <div className="pb-24">
      <DoctorHeader
        title={user?.name ? `Dr. ${user.name}` : "Shift"}
        note={`${format(now, "EEEE d MMMM")} · ${format(now, "h:mm a")} · queue, next consult, and your caseload.`}
      />

      <div className="grid grid-cols-2 gap-px bg-border/60 lg:grid-cols-4">
        {[
          {
            label: "On your list",
            value: stats?.activePatientsCount ?? 0,
            note: "Assigned patients",
          },
          {
            label: "Slots today",
            value: stats?.appointmentsToday ?? 0,
            note: "Booked for today",
          },
          {
            label: "Waiting now",
            value: todayVisits.length,
            note: "Still to see",
          },
          {
            label: "On shift",
            value: stats?.timeOnShift || "0h 0m",
            note: "Elapsed this roster",
          },
        ].map((s) => (
          <div key={s.label} className="bg-background px-4 py-5 sm:px-6">
            <p className="mono-label text-[10px] text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight">
              {loading ? "—" : s.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="grid min-h-[calc(100vh-18rem)] xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)_minmax(0,1fr)] lg:grid-cols-2">
        <div className="min-w-0 border-b border-border/60 lg:border-r lg:border-b-0">
          <div className="flex items-end justify-between border-b border-border/40 px-4 py-3 sm:px-6">
            <h2 className="font-display text-sm font-bold">Today’s queue</h2>
            <span className="mono-label text-[10px] text-muted-foreground">
              {todayVisits.length} waiting
            </span>
          </div>
          {todayVisits.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground sm:px-6">
              No open visits today. Confirm someone from Clinic, or open a
              patient from your caseload.
            </p>
          ) : (
            todayVisits.map((visit) => {
              const pat =
                typeof visit.patient === "object" ? visit.patient : null;
              const canStart =
                visit.status === "CONFIRMED" || visit.status === "IN_PROGRESS";
              return (
                <div
                  key={visit._id}
                  className="flex items-stretch border-b border-border/40"
                >
                  <button
                    type="button"
                    onClick={() => pat && openChart(pat, visit)}
                    className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 text-left hover:bg-muted/40 sm:px-6"
                  >
                    <span className="font-display w-10 shrink-0 text-lg font-bold text-accent">
                      {visit.queueNumber
                        ? String(visit.queueNumber).padStart(2, "0")
                        : "—"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {pat?.name || "Patient"}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span className="font-mono text-foreground">
                          {formatTimeRange(visit.timeSlot, visit.slotEndTime)}
                        </span>
                        <span className="line-clamp-1">{visit.reason}</span>
                      </span>
                    </span>
                    <span className="mono-label ml-auto hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
                      {visit.status}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center border-l border-border/40 px-2">
                    {visit.status === "PENDING" ? (
                      <button
                        type="button"
                        disabled={busyId === visit._id}
                        onClick={() => handleConfirm(visit._id)}
                        className="px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {busyId === visit._id ? "…" : "Confirm"}
                      </button>
                    ) : canStart ? (
                      <button
                        type="button"
                        onClick={() => startConsult(visit, pat)}
                        className="px-3 py-2 text-xs font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        Consult
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex min-w-0 flex-col border-b border-border/60 bg-muted/15 lg:border-b-0 xl:border-r">
          <div className="px-5 py-6 sm:px-8">
            {nextVisit && nextPatient ? (
              <>
                <p className="mono-label text-muted-foreground">Next consult</p>
                <p className="mt-2 font-display text-6xl font-bold tracking-tight text-accent sm:text-7xl">
                  {nextVisit.queueNumber
                    ? String(nextVisit.queueNumber).padStart(2, "0")
                    : "—"}
                </p>
                <h2 className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {nextPatient.name}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatTimeRange(nextVisit.timeSlot, nextVisit.slotEndTime)}
                  {nextVisit.reason ? ` · ${nextVisit.reason}` : ""}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {nextVisit.status === "PENDING" ? (
                    <button
                      type="button"
                      disabled={busyId === nextVisit._id}
                      onClick={() => handleConfirm(nextVisit._id)}
                      className="bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Confirm visit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startConsult(nextVisit, nextPatient)}
                      className="bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Start consult
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openChart(nextPatient, nextVisit)}
                    className="border border-border/60 px-4 py-2.5 text-sm font-semibold hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Open chart
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mono-label text-muted-foreground">Next consult</p>
                <p className="mt-3 font-display text-2xl font-bold tracking-tight">
                  Queue is clear
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open someone from caseload, or wait for the next booking.
                </p>
              </>
            )}
          </div>

          <div className="border-t border-border/60 bg-background">
            <p className="border-b border-border/40 px-5 py-3 font-display text-sm font-bold">
              Follow-ups today
            </p>
            {todayFollowUps.length > 0 ? (
              todayFollowUps.map((p, i) => (
                <button
                  key={p._id || i}
                  type="button"
                  onClick={() => openChart(p)}
                  className="flex w-full items-center justify-between gap-3 border-b border-border/40 px-5 py-3 text-left hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {p.name}
                    </span>
                    <span className="mono-label text-[10px] text-muted-foreground">
                      Due today
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No follow-ups due today.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 border-t border-border/60 lg:col-span-2 xl:col-span-1 xl:border-t-0">
          <div className="flex items-end justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
            <h2 className="font-display text-sm font-bold">Caseload</h2>
            <span className="mono-label text-[10px] text-muted-foreground">
              {patients.length} patients
            </span>
          </div>
          <div className="border-b border-border/40 px-4 py-2 sm:px-6">
            <label className="relative block">
              <span className="sr-only">Search caseload</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={caseloadQuery}
                onChange={(e) => setCaseloadQuery(e.target.value)}
                placeholder="Name, phone, or email"
                className="w-full border border-border/60 bg-background py-2 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>
          </div>
          <div className="max-h-[min(28rem,50vh)] overflow-y-auto xl:max-h-none">
            {caseload.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-6">
                {patients.length === 0
                  ? "No assigned patients yet."
                  : "No one matches that search."}
              </p>
            ) : (
              caseload.map((p) => {
                const inQueue = todayPatientIds.has(p._id);
                return (
                  <div
                    key={p._id}
                    className="flex items-stretch border-b border-border/40"
                  >
                    <button
                      type="button"
                      onClick={() => openChart(p)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 sm:px-6"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {p.name}
                        </span>
                        <span className="mono-label text-[10px] text-muted-foreground">
                          {p.phone || p.email || "No contact"}
                          {inQueue ? " · in today’s queue" : ""}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startConsult(undefined, p)}
                      className="shrink-0 border-l border-border/40 px-3 text-xs font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Note
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <PatientChartDrawer
        open={Boolean(selectedPatient) && !showConsultation}
        patientName={selectedPatient?.name || "Patient"}
        patientNote={
          selectedAppointment
            ? formatTimeRange(
                selectedAppointment.timeSlot,
                selectedAppointment.slotEndTime,
              )
            : selectedPatient?.phone || selectedPatient?.email || "Chart"
        }
        historyLoading={historyLoading}
        historyData={historyData}
        canStartConsult={Boolean(
          selectedAppointment
            ? selectedAppointment.status === "CONFIRMED" ||
                selectedAppointment.status === "IN_PROGRESS"
            : selectedPatient,
        )}
        onClose={() => {
          setSelectedPatient(null);
          setSelectedAppointment(null);
        }}
        onStartConsult={() =>
          startConsult(selectedAppointment || undefined, selectedPatient)
        }
        onOpenReceipt={(c) => setSelectedReceipt(c)}
      />

      {showConsultation && (selectedAppointment || selectedPatient) ? (
        <ConsultationForm
          appointment={selectedAppointment || undefined}
          patient={selectedPatient}
          onBack={() => setShowConsultation(false)}
          onComplete={() => {
            setShowConsultation(false);
            loadToday();
            if (selectedPatient)
              openChart(selectedPatient, selectedAppointment || undefined);
          }}
        />
      ) : null}

      {selectedReceipt && selectedPatient ? (
        <OpdReceiptModal
          consultation={selectedReceipt}
          patient={selectedPatient}
          doctor={user}
          onClose={() => setSelectedReceipt(null)}
        />
      ) : null}
    </div>
  );
}
