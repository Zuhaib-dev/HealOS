"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  XCircle,
  FileText,
  Building2,
  Stethoscope,
  Loader2,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { updateAppointmentStatusApi } from "@/lib/api/appointment";
import { toast } from "sonner";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";
import { DashboardConsultation } from "@/lib/api/patient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OpdReceiptModal } from "@/components/doctor/shared/opd-receipt-modal";

export function AppointmentsPanel() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [page, setPage] = useState(1);
  const limit = 6;
  const { data, isLoading, refetch } = usePatientDashboard();
  const [selectedConsultation, setSelectedConsultation] = useState<DashboardConsultation | null>(null);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment booking?")) return;
    try {
      const res = await updateAppointmentStatusApi(id, "CANCELLED");
      if (res.success) {
        toast.success("Appointment cancelled");
        refetch();
      }
    } catch (err) {
      toast.error("Failed to cancel appointment");
    }
  };

  const liveAppointments = data?.appointments || [];
  const consultations = data?.consultations || [];

  const futureFollowUps = consultations
    .filter(c => c.followUpDate && new Date(c.followUpDate) >= new Date())
    .map(c => ({
      _id: "followup-" + c._id,
      status: "CONFIRMED",
      type: "IN_PERSON",
      reason: "Follow-Up: " + (c.diagnosis || "Consultation"),
      doctor: c.doctor,
      date: c.followUpDate,
      timeSlot: "Walk-in",
      department: "General/Walk-in",
      isFollowUp: true
    }));

  const pastWalkIns = consultations
    .filter(c => !(c as any).appointment)
    .map(c => ({
      _id: "walkin-" + c._id,
      status: "COMPLETED",
      type: "IN_PERSON",
      reason: (c as any).chiefComplaint || c.diagnosis || "Direct Consultation",
      doctor: c.doctor,
      date: c.createdAt,
      timeSlot: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      department: "Walk-in",
      isWalkIn: true,
      originalConsultation: c
    }));

  const combinedAppointments = [...liveAppointments, ...futureFollowUps, ...pastWalkIns];

  const filteredLive = combinedAppointments
    .filter((a: any) =>
      tab === "upcoming"
        ? a.status !== "COMPLETED" && a.status !== "CANCELLED"
        : a.status === "COMPLETED" || a.status === "CANCELLED"
    )
    .sort((a: any, b: any) => 
      tab === "upcoming" 
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  const paginatedAppointments = filteredLive.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredLive.length / limit);

  return (
    <section className="pb-12">
      <PanelHeader
        index="03 / visits"
        title="Appointments Desk"
        note="View scheduled visits, check past records, or cancel upcoming consultations."
        actions={
          <div className="flex bg-muted/50 p-1 rounded-md border border-border/40">
            <button
              onClick={() => { setTab("upcoming"); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                tab === "upcoming" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => { setTab("past"); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                tab === "past" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"
              }`}
            >
              Past / Cancelled
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse shadow-none border-border/40">
                <CardContent className="p-6 h-40 bg-muted/20" />
              </Card>
            ))}
          </div>
        ) : filteredLive.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedAppointments.map((a) => (
              <Card
                key={a._id}
                className="group relative shadow-sm border-border/60 hover:shadow-md hover:border-primary/20 transition-all overflow-hidden flex flex-col"
              >
                {/* Top color bar depending on status */}
                <div
                  className={`h-1.5 w-full ${
                    a.status === "CONFIRMED"
                      ? "bg-emerald-500"
                      : a.status === "COMPLETED"
                      ? "bg-cyan-500"
                      : a.status === "CANCELLED"
                      ? "bg-destructive"
                      : "bg-amber-500"
                  }`}
                />
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 font-bold tracking-wider uppercase border-0 ${
                        a.status === "CONFIRMED"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : a.status === "COMPLETED"
                          ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                          : a.status === "CANCELLED"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {a.status}
                    </Badge>
                    
                    <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {a.type === "TELECONSULT" ? (
                        <><Video className="size-3 text-cyan-500" /> Video Call</>
                      ) : (
                        <><MapPin className="size-3 text-emerald-500" /> In Person</>
                      )}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold leading-tight text-foreground mb-1 line-clamp-1">
                    {a.reason}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                    <Stethoscope className="size-3.5" />
                    <span>Dr. {a.doctor.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5">
                    <Building2 className="size-3.5" />
                    <span>{a.department}</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-3 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5">
                        <Calendar className="size-3" /> Date
                      </span>
                      <span className="text-sm font-medium text-foreground">{a.date}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1.5">
                        <Clock className="size-3" /> Time
                      </span>
                      <span className="text-sm font-medium text-foreground">{a.timeSlot}</span>
                    </div>
                  </div>

                  {/* Actions footer anchored to bottom */}
                  <div className="mt-auto pt-2">
                    {(a as any).isFollowUp ? (
                      <div className="w-full text-center text-xs font-semibold text-indigo-500 bg-indigo-500/10 py-2 rounded-md">
                        Walk-in Follow-Up Required
                      </div>
                    ) : a.status === "PENDING" || a.status === "CONFIRMED" ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(a._id)}
                        className="w-full flex items-center justify-center gap-2 text-xs font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 border border-transparent hover:border-destructive/20 py-2 rounded-md transition-all"
                      >
                        <XCircle className="size-3.5" /> Cancel Appointment
                      </button>
                    ) : a.status === "COMPLETED" ? (
                      <button
                        type="button"
                        onClick={() => {
                          const note = (a as any).isWalkIn ? (a as any).originalConsultation : consultations.find(c => (c as any).appointment === a._id || (c as any).appointment?._id === a._id);
                          if (note) {
                            // Attach the doctor info from the appointment so the receipt can display it
                            setSelectedConsultation({ ...note, doctor: a.doctor } as any);
                          } else {
                            toast.info("Clinical note not available yet for this appointment.");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 py-2 rounded-md transition-all"
                      >
                        <FileText className="size-3.5" /> View Receipt
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/40">
                <span className="mono-label text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, filteredLive.length)} of {filteredLive.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/60 hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/60 hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/30 rounded-xl border border-dashed border-border/60">
            <Calendar className="size-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-foreground">No {tab} appointments</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              You don't have any {tab} appointments in your schedule right now.
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
