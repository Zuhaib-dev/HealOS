"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, TriangleAlert, PenLine, Send, X, CheckCircle2, Calendar, FileText, ChevronRight, User as UserIcon, Activity, Pill as PillIcon, FileDigit, Eye, FileCheck, Loader2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import { updateAppointmentStatusApi, AppointmentRecord } from "@/lib/api/appointment";
import { toast } from "sonner";
import { getDashboardStatsApi, getPatientHistoryApi } from "@/lib/api/doctor";
import { AnimatePresence } from "motion/react";
import { ConsultationForm } from "@/components/doctor/shared/consultation-form";
import { OpdReceiptModal } from "@/components/doctor/shared/opd-receipt-modal";
import { getSocket } from "@/lib/socket";
import { getFileUrl } from "@/lib/utils";

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

/* ---------- 01 · Shift board ---------- */

export function ShiftPanel() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = () => {
    getDashboardStatsApi()
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        toast.error("Failed to load dashboard stats");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadStats();

    const socket = getSocket();
    if (socket) {
      socket.on("appointment_updated", loadStats);
      socket.on("appointment_created", loadStats);
      return () => {
        socket.off("appointment_updated", loadStats);
        socket.off("appointment_created", loadStats);
      };
    }
  }, []);

  const statCards = [
    { label: "Patients under you", value: stats?.activePatientsCount || 0, note: "Active patients" },
    { label: "Clinic slots today", value: stats?.appointmentsToday || 0, note: "Scheduled for today" },
    { label: "Pending Follow-ups", value: stats?.followUpsCount || 0, note: "Scheduled target dates", highlight: true },
    { label: "Time on shift", value: stats?.timeOnShift || "0h 0m", note: "Started recently" },
  ];
  const [patients, setPatients] = useState<any[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<any[]>([]);

  // Drawer State
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [showConsultation, setShowConsultation] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const handleViewPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);
    try {
      const res = await getPatientHistoryApi(patient._id);
      if (res.status === "success") {
        setHistoryData(res.data);
      }
    } catch (e) {
      toast.error("Failed to load patient history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    import("@/lib/api/doctor").then(({ getAssignedPatientsApi }) => {
      getAssignedPatientsApi().then(res => {
        setPatients(res.data.patients || []);
        setTodayFollowUps(res.data.todayFollowUps || []);
      });
    });
  }, []);

  return (
    <div>
      <PanelHeader
        index="01 / shift"
        title={`Shift Board — Dr. ${user?.name || "Clinician"}`}
        note={`Duty Designation: ${user?.role || "DOCTOR"} · Email: ${user?.email || "N/A"}`}
        actions={
          <>
            <ActionButton>Print round sheet</ActionButton>
            <ActionButton tone="solid">Start ward round</ActionButton>
          </>
        }
      />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              className={`border border-border/60 rounded-2xl flex flex-col justify-between p-5 min-h-30 transition-all shadow-sm ${
                s.highlight ? "bg-primary/5 border-primary/20" : "bg-card hover:bg-muted/30"
              }`}
            >
              <span className={`mono-label text-xs ${s.highlight ? "text-primary font-bold" : "text-muted-foreground"}`}>{s.label}</span>
              <div>
                <div className={`text-3xl font-display font-bold tracking-tight mt-3 ${s.highlight ? "text-primary" : "text-foreground"}`}>
                  {loading ? <Loader2 className="size-6 animate-spin opacity-50" /> : s.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1 opacity-80">{loading ? "Loading..." : s.note}</div>
              </div>
            </motion.div>
          ))}
        </div>

      <div className="grid lg:grid-cols-3 gap-6 pb-12">
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/30 flex items-center justify-between">
            <p className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" /> Recent Patients
            </p>
          </div>
          <div className="p-2 space-y-1">
            {patients.length > 0 ? patients.slice(0, 5).map((p) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleViewPatient(p)}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{p.name}</p>
                    <p className="mono-label text-muted-foreground text-[10px]">
                      {p.email} • {p.phone || "No phone"}
                    </p>
                  </div>
                </div>
                <div className="size-8 rounded-full bg-background border border-border/60 flex items-center justify-center text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-colors">
                  <ChevronRight className="size-4" />
                </div>
              </motion.div>
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center">
                <UserIcon className="size-8 opacity-20 mb-3" />
                No active patients found.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/30 flex items-center justify-between">
            <p className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <Calendar className="size-4 text-indigo-500" /> Today's Follow-Ups
            </p>
          </div>
          <div className="p-2 space-y-1">
            {todayFollowUps.length > 0 ? todayFollowUps.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleViewPatient(p)}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group border-l-2 border-transparent hover:border-indigo-500"
              >
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{p.name}</p>
                    <p className="mono-label text-muted-foreground text-[10px]">
                      Walk-in Expected
                    </p>
                  </div>
                </div>
                <div className="size-8 rounded-full bg-background border border-border/60 flex items-center justify-center text-muted-foreground group-hover:border-indigo-500 group-hover:text-indigo-500 transition-colors">
                  <ChevronRight className="size-4" />
                </div>
              </motion.div>
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center">
                <Calendar className="size-8 opacity-20 mb-3" />
                No follow-ups scheduled for today.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/30 flex items-center justify-between">
            <p className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
              <PenLine className="size-4" /> Pending Actions
            </p>
          </div>
          <div className="p-12 flex flex-col items-center justify-center text-center h-75">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <Check className="size-8" strokeWidth={3} />
            </div>
            <h3 className="font-display font-bold text-lg mb-1">You're all caught up!</h3>
            <p className="text-sm text-muted-foreground max-w-50">No pending labs to review or documents to sign.</p>
          </div>
        </div>
      </div>

      {/* Slide-out Drawer for Patient History */}
      <AnimatePresence>
        {selectedPatient && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedPatient(null)}
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
                   <h2 className="font-display text-2xl font-bold">{selectedPatient.name}</h2>
                   <p className="mono-label text-muted-foreground mt-1 text-[10px]">{selectedPatient.email}</p>
                 </div>
                 <button 
                   onClick={() => setSelectedPatient(null)}
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
                             <div key={c._id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm group hover:border-primary/50 transition-colors">
                               <div className="flex justify-between items-start mb-2">
                                 <span className="mono-label text-xs font-bold">{new Date(c.createdAt).toLocaleDateString()}</span>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{c.status}</span>
                                    <button 
                                      onClick={() => setSelectedReceipt(c)}
                                      className="size-6 bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground rounded flex items-center justify-center transition-colors"
                                      title="View Ticket"
                                    >
                                      <FileCheck className="size-3.5" />
                                    </button>
                                  </div>
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
                               <button
                                  onClick={() => {
                                    const url = r.fileUrl || r.reportUrl;
                                    if (url) {
                                      window.open(getFileUrl(url), "_blank");
                                    } else {
                                      toast.error("Document file not available");
                                    }
                                  }}
                                  className="size-8 rounded-md bg-foreground/5 hover:bg-foreground/10 text-foreground flex items-center justify-center shrink-0 transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="size-4" />
                                </button>
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

      {showConsultation && selectedPatient && (
        <ConsultationForm 
          patient={selectedPatient}
          onBack={() => setShowConsultation(false)}
          onComplete={() => {
            setShowConsultation(false);
            handleViewPatient(selectedPatient); // refresh history
          }}
        />
      )}

      {/* OPD Receipt Modal */}
      {selectedReceipt && selectedPatient && (
        <OpdReceiptModal 
          consultation={selectedReceipt}
          patient={selectedPatient}
          doctor={user}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
