"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Video,
  MapPin,
  XCircle,
  FileText,
  Building2,
  Stethoscope,
} from "lucide-react";
import { PatientHeader } from "@/components/patient/patient-header";
import { updateAppointmentStatusApi } from "@/lib/api/appointment";
import { toast } from "sonner";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";
import { DashboardConsultation } from "@/lib/api/patient";
import { OpdReceiptModal } from "@/components/doctor/shared/opd-receipt-modal";
import { TelemedicineWorkbench } from "../../video-call/telemedicine-workbench";
import {
  addMinutesToClock,
  formatTime12Hour,
  formatTimeRange,
} from "@/lib/time-format";

export function AppointmentsPanel() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [page, setPage] = useState(1);
  const limit = 6;
  const { data, isLoading, refetch } = usePatientDashboard();
  const [selectedConsultation, setSelectedConsultation] =
    useState<DashboardConsultation | null>(null);
  const [activeVideoCallId, setActiveVideoCallId] = useState<string | null>(
    null,
  );

  const handleCancel = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this appointment booking?",
      )
    )
      return;
    try {
      const res = await updateAppointmentStatusApi(id, "CANCELLED");
      if (res.success) {
        toast.success("Appointment cancelled");
        refetch();
      }
    } catch {
      toast.error("Failed to cancel appointment");
    }
  };

  const liveAppointments = data?.appointments || [];
  const consultations = data?.consultations || [];

  const futureFollowUps = consultations
    .filter((c) => c.followUpDate && new Date(c.followUpDate) >= new Date())
    .map((c) => ({
      _id: "followup-" + c._id,
      status: "CONFIRMED",
      type: "IN_PERSON",
      reason: "Follow-Up: " + (c.diagnosis || "Consultation"),
      doctor: c.doctor,
      date: c.followUpDate,
      timeSlot: "Walk-in",
      slotEndTime: undefined,
      arrivalTime: undefined,
      queueNumber: undefined,
      amount: undefined,
      paidAmount: undefined,
      department: "General/Walk-in",
      isFollowUp: true,
    }));

  const pastWalkIns = consultations
    .filter((c) => !(c as any).appointment)
    .map((c) => ({
      _id: "walkin-" + c._id,
      status: "COMPLETED",
      type: "IN_PERSON",
      reason: (c as any).chiefComplaint || c.diagnosis || "Direct Consultation",
      doctor: c.doctor,
      date: c.createdAt,
      timeSlot: new Date(c.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      slotEndTime: undefined,
      arrivalTime: undefined,
      queueNumber: undefined,
      amount: undefined,
      paidAmount: undefined,
      department: "Walk-in",
      isWalkIn: true,
      originalConsultation: c,
    }));

  const combinedAppointments = [
    ...liveAppointments,
    ...futureFollowUps,
    ...pastWalkIns,
  ];

  const filteredLive = combinedAppointments
    .filter((a: any) =>
      tab === "upcoming"
        ? a.status !== "COMPLETED" && a.status !== "CANCELLED"
        : a.status === "COMPLETED" || a.status === "CANCELLED",
    )
    .sort((a: any, b: any) =>
      tab === "upcoming"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  const paginatedAppointments = filteredLive.slice(
    (page - 1) * limit,
    page * limit,
  );
  const totalPages = Math.ceil(filteredLive.length / limit);

  if (activeVideoCallId) {
    return (
      <div className="fixed inset-0 z-100 bg-background">
        <TelemedicineWorkbench
          appointmentId={activeVideoCallId}
          isDoctor={false}
          onEndCall={() => setActiveVideoCallId(null)}
        />
      </div>
    );
  }

  return (
    <section className="pb-24 lg:pb-12">
      <PatientHeader
        title="Visits"
        note="Upcoming and past appointments. Cancel if you no longer need the slot."
        actions={
          <div className="flex border border-border/60">
            <button
              type="button"
              onClick={() => {
                setTab("upcoming");
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold ${
                tab === "upcoming"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("past");
                setPage(1);
              }}
              className={`border-l border-border/60 px-3 py-2 text-xs font-semibold ${
                tab === "past"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Past
            </button>
          </div>
        }
      />

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex flex-col gap-px bg-border/60">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse bg-foreground/4" />
            ))}
          </div>
        ) : filteredLive.length > 0 ? (
          <>
            <div className="flex flex-col gap-px bg-border/60">
              {paginatedAppointments.map((a) => (
                <article
                  key={a._id}
                  className="flex flex-col gap-4 bg-background p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono-label bg-foreground/6 px-2 py-1 text-[10px]">
                        {a.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {a.type === "TELECONSULT" ? (
                          <Video className="size-3 text-accent" />
                        ) : (
                          <MapPin className="size-3 text-accent" />
                        )}
                        {a.type === "TELECONSULT" ? "Video" : "In person"}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold leading-tight">
                      {a.reason}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="size-3.5" />
                        Dr. {a.doctor.name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3.5" />
                        {a.department}
                      </span>
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="mono-label text-[10px] text-muted-foreground">
                          Date
                        </p>
                        <p className="mt-0.5 font-medium">
                          {format(
                            new Date(`${String(a.date).slice(0, 10)}T12:00:00`),
                            "EEE, MMM d, yyyy",
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="mono-label text-[10px] text-muted-foreground">
                          Window
                        </p>
                        <p className="mt-0.5 font-medium">
                          {formatTimeRange(
                            a.timeSlot,
                            a.slotEndTime || addMinutesToClock(a.timeSlot, 60),
                          )}
                        </p>
                        {a.arrivalTime ? (
                          <p className="mt-1 text-xs font-medium text-accent">
                            Arrive by {formatTime12Hour(a.arrivalTime)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {a.queueNumber ? (
                      <p className="mt-3 font-mono text-sm">
                        Queue #{String(a.queueNumber).padStart(2, "0")}
                      </p>
                    ) : null}
                    {a.paidAmount !== undefined && a.paidAmount > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Advance paid ₹{a.paidAmount}
                        {a.amount > a.paidAmount
                          ? ` · Balance ₹${a.amount - a.paidAmount} at clinic`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-44">
                    {a.type === "TELECONSULT" && a.status === "CONFIRMED" ? (
                      <button
                        type="button"
                        onClick={() => setActiveVideoCallId(a._id)}
                        className="inline-flex items-center justify-center gap-2 bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <Video className="size-4" /> Join call
                      </button>
                    ) : null}
                    {(a as { isFollowUp?: boolean }).isFollowUp ? (
                      <p className="border border-border/60 px-3 py-2 text-center text-xs font-semibold">
                        Walk-in follow-up
                      </p>
                    ) : a.status === "PENDING" || a.status === "CONFIRMED" ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(a._id)}
                        className="inline-flex items-center justify-center gap-2 border border-destructive/30 px-3 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/5"
                      >
                        <XCircle className="size-3.5" /> Cancel
                      </button>
                    ) : a.status === "COMPLETED" ? (
                      <button
                        type="button"
                        onClick={() => {
                          const note = (a as { isWalkIn?: boolean }).isWalkIn
                            ? (
                                a as {
                                  originalConsultation?: DashboardConsultation;
                                }
                              ).originalConsultation
                            : consultations.find(
                                (c) =>
                                  (
                                    c as {
                                      appointment?: string | { _id: string };
                                    }
                                  ).appointment === a._id ||
                                  (
                                    c as {
                                      appointment?: { _id: string };
                                    }
                                  ).appointment?._id === a._id,
                              );
                          if (note) {
                            setSelectedConsultation({
                              ...note,
                              doctor: a.doctor,
                            } as DashboardConsultation);
                          } else {
                            toast.info(
                              "Clinical note not available yet for this appointment.",
                            );
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 border border-border/60 px-3 py-2.5 text-xs font-medium hover:bg-muted/50"
                      >
                        <FileText className="size-3.5" /> Receipt
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
                <span className="mono-label text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, filteredLive.length)} of{" "}
                  {filteredLive.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="border border-border/60 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="border border-border/60 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="border border-dashed border-border/60 px-4 py-16 text-center">
            <Calendar className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No {tab} appointments</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Nothing in this list right now.
            </p>
          </div>
        )}
      </div>

      {selectedConsultation && (
        <OpdReceiptModal
          consultation={selectedConsultation}
          patient={data?.profile}
          doctor={(selectedConsultation as any).doctor}
          onClose={() => setSelectedConsultation(null)}
        />
      )}
    </section>
  );
}
