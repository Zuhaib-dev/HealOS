"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, TriangleAlert, PenLine, Send, X, CheckCircle2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import { updateAppointmentStatusApi, AppointmentRecord, fetchDoctorAppointmentsApi } from "@/lib/api/appointment";
import { toast } from "sonner";
import { ConsultationForm } from "@/components/doctor/shared/consultation-form";
// imports removed
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import { getSocket } from "@/lib/socket";
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
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
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
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-24 shrink-0">
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

/* ---------- 03 · Clinic list ---------- */

export function ClinicPanel() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeConsultation, setActiveConsultation] = useState<AppointmentRecord | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAppointments = async (currentPage: number = page) => {
    try {
      setLoading(true);
      const res = await fetchDoctorAppointmentsApi(currentPage, 10);
      if (res.success && res.appointments) {
        setAppointments(res.appointments);
        if (res.totalPages) setTotalPages(res.totalPages);
        setPage(currentPage);
      }
    } catch (err) {
      console.error("Failed to load doctor appointments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => {
        loadAppointments(page);
      };
      socket.on("appointment_updated", handleUpdate);
      socket.on("appointment_created", handleUpdate);
      return () => {
        socket.off("appointment_updated", handleUpdate);
        socket.off("appointment_created", handleUpdate);
      };
    }
  }, []);

  const handleUpdateStatus = async (id: string, status: "CONFIRMED" | "COMPLETED" | "CANCELLED") => {
    let notes: string | undefined = undefined;

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
    } catch (err) {
      toast.error("Failed to update appointment status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative">
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
      <PanelHeader
        index="03 / clinic"
        title="Assigned Clinic Appointments"
        note="Live patient consultation queue assigned to your clinical schedule."
        actions={<ActionButton tone="solid" onClick={() => loadAppointments()}>Refresh schedule</ActionButton>}
      />
      
      {/* Dashboard Visualizations */}
      {!loading && appointments.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8 pt-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1">
              <QueueRadar appointments={appointments} />
            </div>
            <div className="xl:col-span-2 flex items-center">
              <NeonTimeline appointments={appointments} />
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border-t border-border/50">
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
                <td colSpan={6} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
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
                      <span className="mono-label font-bold text-brass">{a.date}</span>
                      <p className="mono-label text-muted-foreground text-xs">{a.timeSlot}</p>
                    </Td>
                    <Td>
                      <span className="font-medium text-foreground">{pat?.name || "Patient"}</span>
                      <p className="mono-label text-muted-foreground text-[11px]">{pat?.phone || pat?.email}</p>
                    </Td>
                    <Td>
                      <span className="mono-label font-semibold">{a.department}</span>
                    </Td>
                    <Td>
                      <p className="text-sm font-medium">{a.reason}</p>
                      {a.notes && (
                        <p className="text-xs text-emerald-500 font-mono mt-0.5">Note: {a.notes}</p>
                      )}
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">{a.type}</span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {a.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(a._id, "CONFIRMED")}
                              className="hairline mono-label bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2.5 py-1 text-xs rounded hover:opacity-80"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(a._id, "CANCELLED")}
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
                              onClick={() => handleUpdateStatus(a._id, "COMPLETED")}
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
                <td colSpan={6} className="p-8 text-center mono-label text-xs text-muted-foreground">
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
