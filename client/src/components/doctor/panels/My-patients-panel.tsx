"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, TriangleAlert, PenLine, Send, X, CheckCircle2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import { updateAppointmentStatusApi, fetchDoctorAppointmentsApi, AppointmentRecord } from "@/lib/api/appointment";
import { toast } from "sonner";
import { getPatientHistoryApi } from "@/lib/api/doctor";
import { AnimatePresence } from "motion/react";
import { Loader2, Activity, FileText, Pill as PillIcon, FileDigit, ChevronRight, User as UserIcon, Clock, Eye } from "lucide-react";
import { ConsultationForm } from "@/components/doctor/shared/consultation-form";
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

/* ---------- 02 · My patients ---------- */

export function RoundsPanel() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer State
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [showConsultation, setShowConsultation] = useState(false);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetchDoctorAppointmentsApi(1, 100);
      if (res.success && res.appointments) {
        // Only show CONFIRMED appointments in the waiting room
        setAppointments(res.appointments.filter((a: any) => a.status === "CONFIRMED"));
      }
    } catch (err) {
      toast.error("Failed to load waiting room");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    
    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => loadAppointments();
      socket.on("appointment_updated", handleUpdate);
      socket.on("appointment_created", handleUpdate);
      return () => {
        socket.off("appointment_updated", handleUpdate);
        socket.off("appointment_created", handleUpdate);
      };
    }
  }, []);

  const handleViewPatient = async (apt: AppointmentRecord) => {
    setSelectedAppointment(apt);
    setHistoryLoading(true);
    const patId = typeof apt.patient === "object" ? apt.patient._id : apt.patient;
    try {
      const res = await getPatientHistoryApi(patId as string);
      if (res.status === "success") {
        setHistoryData(res.data);
      }
    } catch (e) {
      toast.error("Failed to load patient history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="pb-12">
      <PanelHeader
        index="02 / waiting room"
        title="Today's Patients"
        note="Patients whose appointments you have accepted. Click to review history and start consultation."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
        {loading ? (
          <div className="col-span-full p-12 flex flex-col items-center justify-center text-muted-foreground">
             <Loader2 className="size-8 animate-spin mb-4" />
             Loading waiting room...
          </div>
        ) : appointments.length === 0 ? (
          <div className="col-span-full p-16 flex flex-col items-center justify-center bg-card border border-dashed border-border/60 rounded-2xl">
             <div className="size-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
               <UserIcon className="size-8 text-muted-foreground/50" />
             </div>
             <h3 className="font-display font-bold text-lg mb-1">Waiting Room is empty</h3>
             <p className="text-sm text-muted-foreground">Accept pending requests from the Clinic List to see them here.</p>
          </div>
        ) : (
          appointments.map((apt) => {
            const p = typeof apt.patient === "object" ? apt.patient : { name: "Unknown", _id: apt.patient, email: "" };
            return (
              <motion.article
                key={apt._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                onClick={() => handleViewPatient(apt)}
                className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-40"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-lg">
                        {p.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{p.name}</h3>
                        <p className="mono-label text-muted-foreground text-[10px] uppercase">{p.email || "No email"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/40">
                    <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <Clock className="size-3 text-emerald-500" /> {apt.timeSlot}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{apt.reason}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/40 flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Ready for consult</span>
                  <div className="size-8 rounded-full bg-background border border-border/60 flex items-center justify-center text-muted-foreground group-hover:border-primary/50 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    <ChevronRight className="size-4" />
                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      {/* Slide-out Drawer for Patient History & Consultation */}
      <AnimatePresence>
        {selectedAppointment && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedAppointment(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-125 lg:w-150 bg-background border-l border-border/60 shadow-2xl z-50 flex flex-col"
            >
               <div className="p-6 border-b border-border/40 flex items-center justify-between bg-card">
                 <div>
                   <h2 className="font-display text-2xl font-bold">
                     {typeof selectedAppointment.patient === "object" ? selectedAppointment.patient.name : "Patient"}
                   </h2>
                   <p className="mono-label text-muted-foreground mt-1 text-[10px]">
                     Appointment: {selectedAppointment.timeSlot}
                   </p>
                 </div>
                 <button 
                   onClick={() => setSelectedAppointment(null)}
                   className="size-10 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                 >
                   <X className="size-5" />
                 </button>
               </div>

               <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex justify-end">
                 <ActionButton tone="solid" onClick={() => setShowConsultation(true)}>+ Start Consultation</ActionButton>
               </div>

               <div className="flex-1 overflow-y-auto p-6 bg-muted/10 custom-scrollbar">
                 {historyLoading ? (
                   <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                     <Loader2 className="size-8 animate-spin mb-4" />
                     <p className="mono-label">Loading Medical History...</p>
                   </div>
                 ) : historyData ? (
                   <div className="space-y-8">
                     
                     {/* Consultations */}
                     <section>
                       <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Activity className="size-4 text-primary" /> Past Visits
                       </h3>
                       <div className="space-y-3">
                         {historyData.consultations?.length > 0 ? (
                           historyData.consultations.map((c: any) => (
                             <div key={c._id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                               <div className="flex justify-between items-start mb-2">
                                 <span className="mono-label text-xs font-bold">{new Date(c.createdAt).toLocaleDateString()}</span>
                                 <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{c.status}</span>
                               </div>
                               <p className="text-sm font-semibold mb-1">Dx: {c.diagnosis || "N/A"}</p>
                               <p className="text-xs text-muted-foreground line-clamp-2">{c.chiefComplaint}</p>
                             </div>
                           ))
                         ) : (
                           <p className="text-xs text-muted-foreground italic">No past visits recorded.</p>
                         )}
                       </div>
                     </section>

                     {/* Medicines from Consultations */}
                     <section>
                       <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                         <PillIcon className="size-4 text-emerald-500" /> Prescribed Medications
                       </h3>
                       <div className="space-y-2">
                         {historyData.consultations?.flatMap((c: any) => c.medicines || []).length > 0 ? (
                           historyData.consultations.flatMap((c: any) => c.medicines || []).map((m: any, idx: number) => (
                             <div key={idx} className="bg-card border border-border/60 rounded-lg p-3 flex justify-between items-center">
                               <div>
                                 <p className="font-bold text-sm">{m.name}</p>
                                 <p className="text-xs text-muted-foreground">{m.dosage} • {m.frequency}</p>
                               </div>
                               <span className="text-[10px] bg-muted px-2 py-1 rounded font-mono">{m.duration}</span>
                             </div>
                           ))
                         ) : (
                           <p className="text-xs text-muted-foreground italic">No medications prescribed.</p>
                         )}
                       </div>
                     </section>

                     {/* Reports */}
                     <section>
                       <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                         <FileText className="size-4 text-indigo-500" /> Diagnostic Reports
                       </h3>
                       <div className="space-y-3">
                         {historyData.diagnosticReports?.length > 0 ? (
                           historyData.diagnosticReports.map((r: any) => (
                             <div key={r._id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center gap-4">
                               <div className="size-10 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                                 <FileDigit className="size-5" />
                               </div>
                               <div className="flex-1">
                                 <p className="font-bold text-sm">{r.title || r.fileName || r.testName || "Diagnostic Report"}</p>
                                 <p className="text-xs text-muted-foreground">Uploaded: {new Date(r.createdAt).toLocaleDateString()}</p>
                               </div>
                               {r.fileUrl && (
                                 <a 
                                   href={r.fileUrl} 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   className="size-8 rounded-md bg-foreground/5 hover:bg-foreground/10 text-foreground flex items-center justify-center shrink-0 transition-colors"
                                   title="View Document"
                                 >
                                   <Eye className="size-4" />
                                 </a>
                               )}
                             </div>
                           ))
                         ) : (
                           <p className="text-xs text-muted-foreground italic">No reports available.</p>
                         )}
                       </div>
                     </section>

                   </div>
                 ) : (
                   <div className="text-center text-muted-foreground py-10">Failed to load data.</div>
                 )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Embedded Consultation Form */}
      {showConsultation && selectedAppointment && (
        <ConsultationForm 
          appointment={selectedAppointment}
          onBack={() => setShowConsultation(false)}
          onComplete={() => {
            setShowConsultation(false);
            setSelectedAppointment(null);
            loadAppointments(); // refresh waiting room (the appointment is now COMPLETED, so it will disappear)
          }}
        />
      )}
    </div>
  );
}
