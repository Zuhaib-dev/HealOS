"use client";

/* Hallmark · pre-emit critique: P4 H5 E4 S5 R4 V4
 * genre: modern-minimal · macrostructure: Map / Diagram
 * theme: Emerald Prestige · designed-as-app
 * audience: hospital admins · use: see the day's rooms and staff on a map
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ActionButton } from "../admin-shell";
import { AdminHeader } from "../admin-header";
import {
  fetchAdminScheduleApi,
  createScheduleApi,
  fetchDoctorAvailabilitiesApi,
  saveDoctorAvailabilityApi,
  fetchAdminStaffApi,
  AdminAppointmentData,
  AdminScheduleData,
  AdminStaffData,
} from "@/lib/api/admin";
import { toast } from "sonner";
import { useAdminRealtime } from "../use-admin-realtime";
import { formatTimeRange } from "@/lib/time-format";
import { formatTime12Hour } from "@/lib/time-format";
import { TimePicker12Hour } from "@/components/shared/time-picker-12h";

type AvailabilityRow = {
  _id: string;
  doctor?: { _id: string; name?: string };
  weekdays: number[];
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxPatientsPerDay: number;
  consultationFee: number;
  advanceFee: number;
  active: boolean;
};

type BoardKind = "visit" | "session" | "shift" | "hold";

type BoardEvent = {
  id: string;
  room: string;
  label: string;
  subLabel: string;
  start: number;
  end: number;
  kind: BoardKind;
  timeLabel: string;
};

const WINDOW = { from: 7, to: 20 };
const SPAN = WINDOW.to - WINDOW.from;
const HOURS = Array.from({ length: SPAN + 1 }, (_, i) => WINDOW.from + i);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const TRACK_H = 48;

const fieldClass =
  "mt-1 block w-full hairline bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary/40";

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

function shiftIsoDate(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return clinicDateKey(d);
}

function clockToHours(value?: string) {
  if (!value) return WINDOW.from;
  const [h, m] = value.split(":");
  return parseInt(h || "0", 10) + parseInt(m || "0", 10) / 60;
}

function bookableCapacity(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number,
  maxPatientsPerDay: number,
) {
  if (slotDurationMinutes <= 0) return 0;
  const minutes = Math.max(
    0,
    Math.round((clockToHours(endTime) - clockToHours(startTime)) * 60),
  );
  return Math.min(maxPatientsPerDay, Math.floor(minutes / slotDurationMinutes));
}

function clampHours(n: number) {
  return Math.min(WINDOW.to, Math.max(WINDOW.from, n));
}

function kindTone(kind: BoardKind) {
  switch (kind) {
    case "session":
      return "bg-accent/20 text-foreground";
    case "shift":
      return "bg-primary/12 text-foreground";
    case "hold":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-foreground/[0.06] text-foreground";
  }
}

function layoutRoom(events: BoardEvent[]) {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const ends: number[] = [];
  const placed = sorted.map((event) => {
    let track = ends.findIndex((end) => end <= event.start);
    if (track < 0) {
      track = ends.length;
      ends.push(event.end);
    } else {
      ends[track] = event.end;
    }
    return { ...event, track };
  });
  return { events: placed, trackCount: Math.max(ends.length, 1) };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hairline-l px-5 py-4">
      <p className="mono-label text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}

export function SchedulePanel() {
  const today = clinicDateKey();
  const [viewDate, setViewDate] = useState(today);
  const [nowHours, setNowHours] = useState(() => {
    const n = new Date();
    return n.getHours() + n.getMinutes() / 60;
  });
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AdminAppointmentData[]>([]);
  const [schedules, setSchedules] = useState<AdminScheduleData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [staffList, setStaffList] = useState<AdminStaffData[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>(
    [],
  );
  const [availabilityForm, setAvailabilityForm] = useState({
    doctorId: "",
    weekdays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    slotDurationMinutes: 60,
    maxPatientsPerDay: 8,
    consultationFee: 350,
    advanceFee: 20,
    active: true,
  });
  const timeSlotsPerDay = bookableCapacity(
    availabilityForm.startTime,
    availabilityForm.endTime,
    availabilityForm.slotDurationMinutes,
    100,
  );
  const effectiveDailyCapacity = Math.min(
    availabilityForm.maxPatientsPerDay,
    timeSlotsPerDay,
  );
  const [formData, setFormData] = useState({
    user: "",
    date: today,
    startTime: "08:00",
    endTime: "16:00",
    shiftType: "REGULAR",
    department: "General",
  });

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminScheduleApi(viewDate);
      if (res.success) {
        setAppointments(res.appointments || []);
        setSchedules(res.schedules || []);
      }
      const staffRes = await fetchAdminStaffApi();
      if (staffRes.success && staffRes.staff) {
        setStaffList(staffRes.staff);
      }
      const availabilityRes = await fetchDoctorAvailabilitiesApi();
      setAvailabilityRows(availabilityRes.availability || []);
    } catch (err) {
      console.error("Failed to fetch admin schedule", err);
    } finally {
      setLoading(false);
    }
  }, [viewDate]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useAdminRealtime(["schedule", "appointments", "staff"], loadSchedule);

  useEffect(() => {
    if (viewDate !== today) return;
    const tick = window.setInterval(() => {
      const n = new Date();
      setNowHours(n.getHours() + n.getMinutes() / 60);
    }, 30_000);
    return () => window.clearInterval(tick);
  }, [viewDate, today]);

  const handleCreateShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.user) errors.user = "Please select a staff member.";
    if (!formData.date) errors.date = "Shift date is required.";
    if (!formData.startTime) errors.startTime = "Start time is required.";
    if (!formData.endTime) errors.endTime = "End time is required.";
    if (
      formData.startTime &&
      formData.endTime &&
      formData.startTime >= formData.endTime
    ) {
      errors.endTime = "End time must be after start time.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Fix the shift fields before saving.");
      return;
    }
    setFormErrors({});

    try {
      setIsSubmitting(true);
      await createScheduleApi(formData);
      toast.success("Shift added.");
      setIsFormOpen(false);
      loadSchedule();
    } catch {
      toast.error("Failed to create shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveAvailability = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!availabilityForm.doctorId) {
      toast.error("Select a doctor first");
      return;
    }
    try {
      setIsSavingAvailability(true);
      await saveDoctorAvailabilityApi(availabilityForm.doctorId, {
        ...availabilityForm,
        consultationFee: Number(availabilityForm.consultationFee),
        advanceFee: Number(availabilityForm.advanceFee),
        slotDurationMinutes: Number(availabilityForm.slotDurationMinutes),
        maxPatientsPerDay: Number(availabilityForm.maxPatientsPerDay),
      });
      toast.success("Doctor booking hours saved");
      loadSchedule();
    } catch {
      toast.error("Could not save booking hours");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const applyAvailability = (row: AvailabilityRow) => {
    if (!row.doctor?._id) return;
    setAvailabilityForm({
      doctorId: row.doctor._id,
      weekdays: row.weekdays,
      startTime: row.startTime,
      endTime: row.endTime,
      slotDurationMinutes: row.slotDurationMinutes,
      maxPatientsPerDay: row.maxPatientsPerDay,
      consultationFee: row.consultationFee,
      advanceFee: row.advanceFee,
      active: row.active,
    });
  };

  const boardEvents = useMemo<BoardEvent[]>(() => {
    const visits = appointments.map((apt) => {
      const start = clampHours(clockToHours(apt.timeSlot));
      const end = clampHours(
        apt.slotEndTime ? clockToHours(apt.slotEndTime) : start + 1,
      );
      const kind: BoardKind =
        apt.status === "COMPLETED"
          ? "session"
          : apt.status === "CANCELLED"
            ? "hold"
            : "visit";
      return {
        id: apt._id,
        room: apt.doctor?.department || "General",
        label: apt.patient?.user?.name || "Patient",
        subLabel: `${apt.queueNumber ? `#${apt.queueNumber} · ` : ""}${apt.doctor?.user?.name || "Doctor"}`,
        start,
        end: Math.max(end, start + 0.25),
        kind,
        timeLabel: formatTimeRange(apt.timeSlot, apt.slotEndTime),
      };
    });
    const shifts = schedules.map((sch) => {
      const start = clampHours(clockToHours(sch.startTime));
      const end = clampHours(clockToHours(sch.endTime));
      return {
        id: sch._id,
        room: sch.department || "General",
        label: sch.user?.name || "Staff",
        subLabel: `${sch.shiftType.replace("_", " ")} · ${sch.user?.role || ""}`,
        start,
        end: Math.max(end, start + 0.25),
        kind: (sch.shiftType === "LEAVE" ? "hold" : "shift") as BoardKind,
        timeLabel: formatTimeRange(sch.startTime, sch.endTime),
      };
    });
    return [...visits, ...shifts];
  }, [appointments, schedules]);

  const rooms = useMemo(() => {
    const names = Array.from(new Set(boardEvents.map((e) => e.room)));
    return names.map((room) => ({
      room,
      ...layoutRoom(boardEvents.filter((e) => e.room === room)),
    }));
  }, [boardEvents]);

  const doctors = staffList.filter((x) =>
    ["DOCTOR", "RADIOLOGIST"].includes(x.user?.role),
  );
  const isToday = viewDate === today;
  const nowLeft =
    isToday && nowHours >= WINDOW.from && nowHours <= WINDOW.to
      ? ((nowHours - WINDOW.from) / SPAN) * 100
      : null;
  const dateLabel = new Date(`${viewDate}T12:00:00`).toLocaleDateString(
    "en-IN",
    { weekday: "short", day: "numeric", month: "short" },
  );

  const visitCount = appointments.filter(
    (a) => a.status !== "CANCELLED",
  ).length;
  const shiftCount = schedules.filter((s) => s.shiftType !== "LEAVE").length;
  const leaveCount = schedules.filter((s) => s.shiftType === "LEAVE").length;
  const hoursCount = availabilityRows.filter((r) => r.active).length;

  return (
    <div>
      <AdminHeader
        title="Theatre"
        note="Rooms, staff, and booked visits on the clinic day."
        actions={
          <>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => setViewDate((d) => shiftIsoDate(d, -1))}
                className="hairline p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <input
                type="date"
                aria-label="Schedule date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value || today)}
                className="mono-label hairline bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              />
              <button
                type="button"
                aria-label="Next day"
                onClick={() => setViewDate((d) => shiftIsoDate(d, 1))}
                className="hairline p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
              {!isToday ? (
                <button
                  type="button"
                  onClick={() => setViewDate(today)}
                  className="mono-label px-2 py-1.5 text-muted-foreground hover:text-foreground"
                >
                  Today
                </button>
              ) : null}
            </div>
            <ActionButton
              tone="solid"
              onClick={() => {
                setFormData((d) => ({ ...d, date: viewDate }));
                setIsFormOpen(true);
              }}
            >
              Add shift
            </ActionButton>
          </>
        }
      />

      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Visits" value={String(visitCount)} />
        <Metric label="Staff on shift" value={String(shiftCount)} />
        <Metric label="Leave" value={String(leaveCount)} />
        <Metric label="Doctors with hours" value={String(hoursCount)} />
      </div>

      {isFormOpen ? (
        <div className="hairline-b px-5 py-5 sm:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold tracking-tight">
              Add staff shift
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setFormErrors({});
              }}
              aria-label="Close add shift form"
              className="p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <form
            onSubmit={handleCreateShift}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
          >
            <div className="lg:col-span-2">
              <label
                htmlFor="shift-user"
                className="mono-label text-muted-foreground"
              >
                Staff
              </label>
              <select
                id="shift-user"
                required
                aria-invalid={Boolean(formErrors.user)}
                aria-describedby={
                  formErrors.user ? "shift-user-error" : undefined
                }
                value={formData.user}
                onChange={(e) => {
                  const s = staffList.find(
                    (x) => x.user._id === e.target.value,
                  );
                  setFormData((d) => ({
                    ...d,
                    user: e.target.value,
                    department: s?.department || "General",
                  }));
                  if (formErrors.user)
                    setFormErrors((prev) => ({ ...prev, user: "" }));
                }}
                className={`${fieldClass} ${formErrors.user ? "border-destructive" : ""}`}
              >
                <option value="">Select staff</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s.user._id}>
                    {s.user.name} ({s.user.role})
                  </option>
                ))}
              </select>
              {formErrors.user ? (
                <span
                  id="shift-user-error"
                  role="alert"
                  className="mono-label mt-1 block text-destructive"
                >
                  {formErrors.user}
                </span>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="shift-date"
                className="mono-label text-muted-foreground"
              >
                Date
              </label>
              <input
                id="shift-date"
                type="date"
                required
                aria-invalid={Boolean(formErrors.date)}
                value={formData.date}
                onChange={(e) => {
                  setFormData((d) => ({ ...d, date: e.target.value }));
                  if (formErrors.date)
                    setFormErrors((prev) => ({ ...prev, date: "" }));
                }}
                className={`${fieldClass} ${formErrors.date ? "border-destructive" : ""}`}
              />
            </div>
            <div>
              <label
                htmlFor="shift-start-time"
                className="mono-label text-muted-foreground"
              >
                Start
              </label>
              <TimePicker12Hour
                id="shift-start-time"
                required
                invalid={Boolean(formErrors.startTime)}
                value={formData.startTime}
                onChange={(startTime) => {
                  setFormData((d) => ({ ...d, startTime }));
                  if (formErrors.startTime)
                    setFormErrors((prev) => ({ ...prev, startTime: "" }));
                }}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label
                htmlFor="shift-end-time"
                className="mono-label text-muted-foreground"
              >
                End
              </label>
              <TimePicker12Hour
                id="shift-end-time"
                required
                invalid={Boolean(formErrors.endTime)}
                value={formData.endTime}
                onChange={(endTime) => {
                  setFormData((d) => ({ ...d, endTime }));
                  if (formErrors.endTime)
                    setFormErrors((prev) => ({ ...prev, endTime: "" }));
                }}
                className="mt-1 w-full"
              />
              {formErrors.endTime ? (
                <span
                  role="alert"
                  className="mono-label mt-1 block text-destructive"
                >
                  {formErrors.endTime}
                </span>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="shift-type"
                className="mono-label text-muted-foreground"
              >
                Type
              </label>
              <select
                id="shift-type"
                required
                value={formData.shiftType}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, shiftType: e.target.value }))
                }
                className={fieldClass}
              >
                <option value="REGULAR">Regular</option>
                <option value="ON_CALL">On call</option>
                <option value="LEAVE">Leave</option>
              </select>
            </div>
            <div className="flex items-end justify-end gap-3 sm:col-span-2 lg:col-span-6">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormErrors({});
                }}
                className="mono-label px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mono-label bg-foreground px-4 py-2 font-bold text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Create shift"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <section className="hairline-b">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4 sm:px-8">
          <div>
            <p className="mono-label text-muted-foreground">Day map</p>
            <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
              {dateLabel}
            </h2>
          </div>
          <div className="mono-label flex flex-wrap gap-4 text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="inline-block size-2.5 bg-primary/30" /> Shift
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block size-2.5 bg-foreground/15" /> Visit
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block size-2.5 bg-accent/40" /> Seen
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block size-2.5 bg-destructive/40" /> Leave
              / cancelled
            </span>
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-12 text-center mono-label text-muted-foreground sm:px-8">
            Loading the day…
          </p>
        ) : rooms.length === 0 ? (
          <p className="px-5 py-12 text-sm text-muted-foreground sm:px-8">
            Nothing booked or rostered for this date. Add a shift, or pick
            another day.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[56rem] px-5 pb-6 sm:px-8">
                <div className="mono-label text-muted-foreground flex pl-28">
                  {HOURS.map((h) => (
                    <span key={h} className="flex-1">
                      {formatTime12Hour(`${String(h).padStart(2, "0")}:00`)}
                    </span>
                  ))}
                </div>
                <div className="mt-2 space-y-3">
                  {rooms.map(({ room, events, trackCount }) => (
                    <div key={room} className="flex items-stretch">
                      <span className="mono-label w-28 shrink-0 py-2 pr-3">
                        {room}
                      </span>
                      <div
                        className="relative min-w-0 flex-1 bg-graph-paper"
                        style={{ height: trackCount * TRACK_H + 8 }}
                      >
                        {HOURS.slice(1).map((h) => (
                          <span
                            key={h}
                            className="hairline-l pointer-events-none absolute top-0 bottom-0"
                            style={{
                              left: `${((h - WINDOW.from) / SPAN) * 100}%`,
                            }}
                          />
                        ))}
                        {nowLeft !== null ? (
                          <span
                            className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-accent"
                            style={{ left: `${nowLeft}%` }}
                            title="Now"
                          />
                        ) : null}
                        {events.map((event) => {
                          const left =
                            ((event.start - WINDOW.from) / SPAN) * 100;
                          const width =
                            ((event.end - event.start) / SPAN) * 100;
                          return (
                            <div
                              key={event.id}
                              style={{
                                left: `${Math.max(0, left)}%`,
                                width: `${Math.max(width, 3)}%`,
                                top: 4 + event.track * TRACK_H,
                                height: TRACK_H - 6,
                              }}
                              className={`absolute z-10 overflow-hidden px-2 py-1 ${kindTone(event.kind)}`}
                            >
                              <span className="block truncate text-xs font-medium leading-tight">
                                {event.label}
                              </span>
                              <span className="mono-label block truncate text-[10px] text-muted-foreground">
                                {event.timeLabel} · {event.subLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ol className="md:hidden">
              {rooms.map(({ room, events }) => (
                <li key={room} className="hairline-b px-5 py-4">
                  <p className="mono-label text-muted-foreground">{room}</p>
                  <ul className="mt-3 space-y-3">
                    {events
                      .slice()
                      .sort((a, b) => a.start - b.start)
                      .map((event) => (
                        <li key={event.id} className="flex gap-3">
                          <span
                            className={`mt-1 size-2.5 shrink-0 ${
                              event.kind === "shift"
                                ? "bg-primary/40"
                                : event.kind === "session"
                                  ? "bg-accent"
                                  : event.kind === "hold"
                                    ? "bg-destructive/50"
                                    : "bg-foreground/20"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{event.label}</p>
                            <p className="mono-label text-muted-foreground">
                              {event.timeLabel} · {event.subLabel}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section>
        <div className="hairline-b px-5 py-4 sm:px-8">
          <p className="mono-label text-muted-foreground">Booking hours</p>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
            Doctor timetable
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Weekdays, slot length, capacity, and fees for patient booking.
          </p>
        </div>
        <form
          onSubmit={saveAvailability}
          className="grid gap-5 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mono-label text-muted-foreground">Doctor</span>
              <select
                aria-label="Doctor"
                className={fieldClass}
                value={availabilityForm.doctorId}
                onChange={(e) => {
                  const saved = availabilityRows.find(
                    (row) => row.doctor?._id === e.target.value,
                  );
                  setAvailabilityForm((v) => ({
                    ...v,
                    doctorId: e.target.value,
                    ...(saved
                      ? {
                          weekdays: saved.weekdays,
                          startTime: saved.startTime,
                          endTime: saved.endTime,
                          slotDurationMinutes: saved.slotDurationMinutes,
                          maxPatientsPerDay: saved.maxPatientsPerDay,
                          consultationFee: saved.consultationFee,
                          advanceFee: saved.advanceFee,
                          active: saved.active,
                        }
                      : {}),
                  }));
                }}
              >
                <option value="">Select doctor</option>
                {doctors.map((x) => (
                  <option key={x.user._id} value={x.user._id}>
                    {x.user.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="mono-label text-muted-foreground">
                Clinic days
              </legend>
              <div className="mt-2 flex flex-wrap gap-1">
                {DAYS.map((day, i) => {
                  const on = availabilityForm.weekdays.includes(i);
                  return (
                    <label
                      key={day}
                      className={`mono-label flex min-w-11 cursor-pointer items-center justify-center px-3 py-2 ${
                        on
                          ? "bg-accent/12 text-brass"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={(e) =>
                          setAvailabilityForm((v) => ({
                            ...v,
                            weekdays: e.target.checked
                              ? [...v.weekdays, i]
                              : v.weekdays.filter((d) => d !== i),
                          }))
                        }
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {availabilityRows.length > 0 ? (
              <div>
                <p className="mono-label text-muted-foreground">Saved</p>
                <ul className="mt-2">
                  {availabilityRows.map((row) => (
                    <li key={row._id}>
                      <button
                        type="button"
                        onClick={() => applyAvailability(row)}
                        className={`hairline-b flex w-full flex-col justify-between gap-1 py-2 text-left text-sm sm:flex-row sm:items-baseline sm:gap-3 ${
                          availabilityForm.doctorId === row.doctor?._id
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="truncate">
                          {row.doctor?.name || "Doctor"}
                        </span>
                        <span className="mono-label text-left sm:shrink-0 sm:text-right">
                          {formatTimeRange(row.startTime, row.endTime)} ·{" "}
                          {bookableCapacity(
                            row.startTime,
                            row.endTime,
                            row.slotDurationMinutes,
                            row.maxPatientsPerDay,
                          )}{" "}
                          bookable/day · {row.maxPatientsPerDay} max ·{" "}
                          {row.slotDurationMinutes} min
                          {row.active ? "" : " · off"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                Start
                <TimePicker12Hour
                  aria-label="Clinic start time"
                  className="mt-1"
                  value={availabilityForm.startTime}
                  onChange={(startTime) =>
                    setAvailabilityForm((v) => ({ ...v, startTime }))
                  }
                />
              </label>
              <label className="block text-xs">
                End
                <TimePicker12Hour
                  aria-label="Clinic end time"
                  className="mt-1"
                  value={availabilityForm.endTime}
                  onChange={(endTime) =>
                    setAvailabilityForm((v) => ({ ...v, endTime }))
                  }
                />
              </label>
              <label className="block text-xs">
                Slot minutes
                <input
                  aria-label="Slot duration"
                  type="number"
                  min={5}
                  className={fieldClass}
                  value={availabilityForm.slotDurationMinutes}
                  onChange={(e) =>
                    setAvailabilityForm((v) => ({
                      ...v,
                      slotDurationMinutes: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs">
                Max patients / day
                <input
                  aria-label="Maximum patients per day"
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={availabilityForm.maxPatientsPerDay}
                  onChange={(e) =>
                    setAvailabilityForm((v) => ({
                      ...v,
                      maxPatientsPerDay: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs">
                Consultation ₹
                <input
                  aria-label="Consultation fee"
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={availabilityForm.consultationFee}
                  onChange={(e) =>
                    setAvailabilityForm((v) => ({
                      ...v,
                      consultationFee: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs">
                Advance ₹
                <input
                  aria-label="Advance fee"
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={availabilityForm.advanceFee}
                  onChange={(e) =>
                    setAvailabilityForm((v) => ({
                      ...v,
                      advanceFee: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-semibold">
                {effectiveDailyCapacity} bookable appointments per day
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {timeSlotsPerDay < availabilityForm.maxPatientsPerDay
                  ? `The ${availabilityForm.startTime}–${availabilityForm.endTime} schedule fits ${timeSlotsPerDay} appointments at ${availabilityForm.slotDurationMinutes}-minute intervals. Extend clinic hours or shorten the interval to offer ${availabilityForm.maxPatientsPerDay}.`
                  : `The schedule supports your ${availabilityForm.maxPatientsPerDay}-patient daily limit.`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Advance is collected online; the rest is due at the clinic.
            </p>
            <button
              type="submit"
              disabled={isSavingAvailability}
              className="mono-label bg-foreground px-4 py-2 font-bold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
            >
              {isSavingAvailability ? "Saving…" : "Save timetable"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
