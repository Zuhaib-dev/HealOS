"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { LogOut, KeyRound, ShieldCheck, ShieldOff, Copy, Plus, UserCog, HeartPulse } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";
import {
  fetchAdminUsersApi,
  fetchAdminPatientsApi,
  fetchAdminScheduleApi,
  createScheduleApi,
  fetchAdminStaffApi,
  fetchAdminIntegrationsApi,
  fetchAdminRolesApi,
  updateUserRoleApi,
  AdminUserData,
  AdminPatientData,
  AdminAppointmentData,
  AdminScheduleData,
  AdminStaffData,
  AdminIntegrationData,
  AdminRoleData,
  PaginationMeta,
} from "@/lib/api/admin";
import { toast } from "sonner";
import { useAdminRealtime } from "../use-admin-realtime";

import { getApiErrorMessage, Th, Td, Pill, PaginationControls, initials, Avatar } from "./shared";

export function SchedulePanel() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AdminAppointmentData[]>([]);
  const [schedules, setSchedules] = useState<AdminScheduleData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [staffList, setStaffList] = useState<AdminStaffData[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for creating a new shift
  const [formData, setFormData] = useState({
    user: "", date: new Date().toISOString().split("T")[0], startTime: "08:00", endTime: "16:00", shiftType: "REGULAR", department: "General"
  });

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminScheduleApi();
      if (res.success) {
        setAppointments(res.appointments || []);
        setSchedules(res.schedules || []);
      }
      const staffRes = await fetchAdminStaffApi();
      if (staffRes.success && staffRes.staff) {
        setStaffList(staffRes.staff);
      }
    } catch (err) {
      console.error("Failed to fetch admin schedule", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadSchedule);
  }, [loadSchedule]);

  useAdminRealtime(["schedule", "appointments", "staff"], loadSchedule);

  const handleCreateShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.user) errors.user = "Please select a staff member.";
    if (!formData.date) errors.date = "Shift date is required.";
    if (!formData.startTime) errors.startTime = "Start time is required.";
    if (!formData.endTime) errors.endTime = "End time is required.";
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.endTime = "End time must be after start time.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please resolve validation errors before creating shift.");
      return;
    }
    setFormErrors({});

    try {
      setIsSubmitting(true);
      await createScheduleApi(formData);
      toast.success("Shift added successfully");
      setIsFormOpen(false);
      loadSchedule();
    } catch (err) {
      toast.error("Failed to create shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduleWindow = { from: 7, to: 20 };
  const span = scheduleWindow.to - scheduleWindow.from;
  const hours = Array.from({ length: span + 1 }, (_, i) => scheduleWindow.from + i);

  // Map appointments
  const mappedApts = appointments.map((apt) => {
    const [hourStr, minStr] = apt.timeSlot.split(":");
    const startHour = parseInt(hourStr) + parseInt(minStr) / 60;
    return {
      id: apt._id,
      room: apt.doctor?.department || "General",
      label: apt.patient?.user?.name || "Patient",
      subLabel: "Case: " + (apt.doctor?.user?.name || "Doctor"),
      start: startHour,
      end: startHour + 1, // Assume 1 hr
      state: apt.status === "COMPLETED" ? "in-theatre" : apt.status === "CANCELLED" ? "delayed" : "scheduled",
    };
  });

  // Map staff shifts
  const mappedShifts = schedules.map((sch) => {
    const [sH, sM] = sch.startTime.split(":");
    const [eH, eM] = sch.endTime.split(":");
    const startHour = parseInt(sH) + parseInt(sM) / 60;
    const endHour = parseInt(eH) + parseInt(eM) / 60;
    return {
      id: sch._id,
      room: sch.department || "General",
      label: sch.user?.name || "Staff",
      subLabel: `Shift: ${sch.shiftType} (${sch.user?.role})`,
      start: startHour,
      end: endHour,
      state: sch.shiftType === "LEAVE" ? "delayed" : "shift",
    };
  });

  const mappedSchedule = [...mappedApts, ...mappedShifts];
  const rooms = Array.from(new Set(mappedSchedule.map((s) => s.room)));

  return (
    <div>
      <PanelHeader
        index="05 / scheduling"
        title="Theatre & Clinic Shifts"
        note="Today's operating list and staff shifts across departments."
        actions={
          <>
            <ActionButton>Print list</ActionButton>
            <ActionButton tone="solid" onClick={() => setIsFormOpen(true)}>Add Shift</ActionButton>
          </>
        }
      />

      {isFormOpen && (
        <div className="hairline-b bg-muted/30 p-5 sm:px-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="mono-label font-bold text-foreground">Add Staff Shift</h3>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setFormErrors({});
              }}
              aria-label="Close add shift form"
              className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            >
              <LogOut className="size-4 rotate-45" />
              <span className="sr-only">Close add shift form</span>
            </button>
          </div>
          <form onSubmit={handleCreateShift} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label htmlFor="shift-user" className="mono-label text-xs text-muted-foreground block mb-1">
                Staff Member
              </label>
              <select
                id="shift-user"
                required={true}
                aria-invalid={Boolean(formErrors.user)}
                aria-describedby={formErrors.user ? "shift-user-error" : undefined}
                value={formData.user}
                onChange={e => {
                  const s = staffList.find(x => x.user._id === e.target.value);
                  setFormData(d => ({ ...d, user: e.target.value, department: s?.department || "General" }));
                  if (formErrors.user) setFormErrors(prev => ({ ...prev, user: "" }));
                }}
                className={`hairline w-full bg-background px-3 py-2 text-sm outline-none focus:border-accent ${formErrors.user ? "border-destructive" : ""}`}
              >
                <option value="">Select staff...</option>
                {staffList.map(s => <option key={s._id} value={s.user._id}>{s.user.name} ({s.user.role})</option>)}
              </select>
              {formErrors.user && (
                <span id="shift-user-error" role="alert" className="mono-label text-[10px] text-destructive block mt-1">
                  {formErrors.user}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="shift-date" className="mono-label text-xs text-muted-foreground block mb-1">
                Date
              </label>
              <input
                id="shift-date"
                type="date"
                required={true}
                aria-invalid={Boolean(formErrors.date)}
                aria-describedby={formErrors.date ? "shift-date-error" : undefined}
                value={formData.date}
                onChange={e => {
                  setFormData(d => ({ ...d, date: e.target.value }));
                  if (formErrors.date) setFormErrors(prev => ({ ...prev, date: "" }));
                }}
                className={`hairline w-full bg-background px-3 py-2 text-sm outline-none focus:border-accent ${formErrors.date ? "border-destructive" : ""}`}
              />
              {formErrors.date && (
                <span id="shift-date-error" role="alert" className="mono-label text-[10px] text-destructive block mt-1">
                  {formErrors.date}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="shift-start-time" className="mono-label text-xs text-muted-foreground block mb-1">
                Start Time
              </label>
              <input
                id="shift-start-time"
                type="time"
                required={true}
                aria-invalid={Boolean(formErrors.startTime)}
                aria-describedby={formErrors.startTime ? "shift-start-time-error" : undefined}
                value={formData.startTime}
                onChange={e => {
                  setFormData(d => ({ ...d, startTime: e.target.value }));
                  if (formErrors.startTime) setFormErrors(prev => ({ ...prev, startTime: "" }));
                }}
                className={`hairline w-full bg-background px-3 py-2 text-sm outline-none focus:border-accent ${formErrors.startTime ? "border-destructive" : ""}`}
              />
              {formErrors.startTime && (
                <span id="shift-start-time-error" role="alert" className="mono-label text-[10px] text-destructive block mt-1">
                  {formErrors.startTime}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="shift-end-time" className="mono-label text-xs text-muted-foreground block mb-1">
                End Time
              </label>
              <input
                id="shift-end-time"
                type="time"
                required={true}
                aria-invalid={Boolean(formErrors.endTime)}
                aria-describedby={formErrors.endTime ? "shift-end-time-error" : undefined}
                value={formData.endTime}
                onChange={e => {
                  setFormData(d => ({ ...d, endTime: e.target.value }));
                  if (formErrors.endTime) setFormErrors(prev => ({ ...prev, endTime: "" }));
                }}
                className={`hairline w-full bg-background px-3 py-2 text-sm outline-none focus:border-accent ${formErrors.endTime ? "border-destructive" : ""}`}
              />
              {formErrors.endTime && (
                <span id="shift-end-time-error" role="alert" className="mono-label text-[10px] text-destructive block mt-1">
                  {formErrors.endTime}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="shift-type" className="mono-label text-xs text-muted-foreground block mb-1">
                Shift Type
              </label>
              <select
                id="shift-type"
                required
                value={formData.shiftType}
                onChange={e => setFormData(d => ({ ...d, shiftType: e.target.value }))}
                className="hairline w-full bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="REGULAR">REGULAR</option>
                <option value="ON_CALL">ON CALL</option>
                <option value="LEAVE">LEAVE</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-6 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormErrors({});
                }}
                className="mono-label text-muted-foreground px-4 py-2 hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-foreground text-background mono-label px-4 py-2 font-bold hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? "Creating Shift..." : "Create Shift"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto px-5 py-6 sm:px-8">
        {loading ? (
          <p className="mono-label text-muted-foreground animate-pulse text-center p-8">Loading schedule from database...</p>
        ) : (
          <div className="min-w-200">
            <div className="mono-label text-muted-foreground flex pl-28">
              {hours.map((h) => (
                <span key={h} className="flex-1">
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-4">
              {rooms.length > 0 ? rooms.map((room) => {
                const roomEvents = mappedSchedule.filter((s) => s.room === room);
                return (
                  <div key={room} className="flex items-stretch">
                    <span className="mono-label w-28 shrink-0 py-1">{room}</span>
                    <div className="hairline relative min-h-16 flex-1 bg-graph-paper">
                      {roomEvents.map((s, idx) => {
                        const left = ((s.start - scheduleWindow.from) / span) * 100;
                        const width = ((s.end - s.start) / span) * 100;
                        const tone =
                          s.state === "in-theatre"
                            ? "bg-accent/25 text-brass border-l-2 border-l-[var(--color-accent)] z-20"
                            : s.state === "shift"
                              ? "bg-primary/10 text-primary border-l-2 border-l-primary z-10"
                              : s.state === "delayed"
                                ? "bg-destructive/15 text-destructive border-l-2 border-l-current z-20"
                                : "bg-foreground/[0.06] text-foreground border-l-2 border-l-[var(--hairline)] z-20";
                        
                        const topOffset = s.state === "shift" ? 0 : 36;
                        
                        return (
                          <motion.div
                            key={s.id + idx}
                            initial={{ opacity: 0, scaleX: 0.4 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            style={{ left: `${Math.max(0, left)}%`, width: `${width}%`, originX: 0, top: `${topOffset}px` }}
                            className={`absolute h-8 overflow-hidden px-2 py-1 ${tone}`}
                          >
                            <span className="mono-label block truncate leading-tight">{s.label}</span>
                            <span className="mono-label text-muted-foreground block truncate leading-tight text-[10px]">
                              {s.subLabel}
                            </span>
                            {s.state === "in-theatre" && (
                              <motion.span
                                className="bg-accent absolute top-0 right-0 h-full w-0.5"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : (
                <p className="mono-label text-muted-foreground text-center p-8 border border-dashed border-border/60">No appointments or shifts scheduled for today.</p>
              )}
            </div>
            <div className="mono-label text-muted-foreground mt-8 flex gap-5">
              <span className="flex items-center gap-2">
                <span className="bg-primary/20 inline-block size-2.5" /> Staff Shift
              </span>
              <span className="flex items-center gap-2">
                <span className="bg-accent/40 inline-block size-2.5" /> Case in-session
              </span>
              <span className="flex items-center gap-2">
                <span className="bg-foreground/20 inline-block size-2.5" /> Case scheduled
              </span>
              <span className="flex items-center gap-2">
                <span className="bg-destructive/40 inline-block size-2.5" /> cancelled/leave
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ---------- 07 · Roles & permissions ---------- */
