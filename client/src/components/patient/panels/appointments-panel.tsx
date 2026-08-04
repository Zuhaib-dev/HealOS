import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  XCircle,
  FileText,
  Building2,
  Stethoscope,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchPatientAppointmentsApi,
  updateAppointmentStatusApi,
  AppointmentRecord,
} from "@/lib/api/appointment";
import { toast } from "sonner";

export function AppointmentsPanel() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);
  const [liveAppointments, setLiveAppointments] = useState<AppointmentRecord[]>([]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetchPatientAppointmentsApi();
      if (res.success && res.appointments) {
        setLiveAppointments(res.appointments);
      }
    } catch (err) {
      console.error("Failed to fetch patient appointments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment booking?")) return;
    try {
      const res = await updateAppointmentStatusApi(id, "CANCELLED");
      if (res.success) {
        toast.success("Appointment cancelled");
        loadAppointments();
      }
    } catch (err) {
      toast.error("Failed to cancel appointment");
    }
  };

  const filteredLive = liveAppointments.filter((a) =>
    tab === "upcoming"
      ? a.status !== "COMPLETED" && a.status !== "CANCELLED"
      : a.status === "COMPLETED" || a.status === "CANCELLED"
  );

  return (
    <section className="pb-12">
      <PanelHeader
        index="03 / visits"
        title="Appointments Desk"
        note="View scheduled visits, check past records, or cancel upcoming consultations."
        actions={
          <div className="flex bg-muted/50 p-1 rounded-md border border-border/40">
            <button
              onClick={() => setTab("upcoming")}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                tab === "upcoming" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setTab("past")}
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
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse shadow-none border-border/40">
                <CardContent className="p-6 h-40 bg-muted/20" />
              </Card>
            ))}
          </div>
        ) : filteredLive.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredLive.map((a) => (
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
                    {a.status === "PENDING" || a.status === "CONFIRMED" ? (
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
                        className="w-full flex items-center justify-center gap-2 text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 py-2 rounded-md transition-all"
                      >
                        <FileText className="size-3.5" /> View Clinical Note
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
    </section>
  );
}
