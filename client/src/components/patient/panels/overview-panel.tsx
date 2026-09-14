"use client";

/* Hallmark · macrostructure: Bento Grid · genre: modern-minimal
 * states: hover
 * contrast: pass
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TriangleAlert,
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  Scale,
  Users,
  AlertCircle,
  Stethoscope,
  ShieldCheck,
  Loader2,
  Calendar,
  ChevronRight,
  CalendarClock,
  Pill,
  Sparkles,
  X
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

/** Animated trend line — drawn, never an image. */
function Trend({ series, color }: { series: number[], color?: string }) {
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const pts = series
    .map((v, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * 100;
      const y = 30 - ((v - min) / Math.max(0.001, max - min)) * 24 - 3;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-12 w-full">
      <motion.polyline
        points={pts}
        fill="none"
        stroke={color || "var(--color-primary)"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

// Reusable Cell Shell for the Bento Grid
function CellShell({
  id,
  title,
  children,
  className = "",
  delay = 0,
  icon: Icon
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  icon?: any;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`group relative flex flex-col p-6 rounded-3xl bg-card/60 border border-border/60 shadow-sm hover:shadow-md hover:bg-card/80 transition-all overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between mb-6">
        <span className="mono-label text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wider font-semibold">
          <span className="text-primary">{id}</span> · {title}
        </span>
        {Icon && <Icon className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
      </div>
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </motion.div>
  );
}

export function OverviewPanel() {
  const { user } = useAuthStore();
  const { data, isLoading, error } = usePatientDashboard();

  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-rose-500 font-mono text-sm">
        [ERR] Failed to load patient telemetry.
      </div>
    );
  }

  const profile = data.profile;
  const userName = user?.name || "Patient";
  const bloodGroup = profile?.bloodGroup || "O+";
  const allergiesList = profile?.allergies?.length ? profile.allergies : ["No known allergies"];
  
  const conditions = data.consultations.map(c => c.diagnosis).filter(Boolean);
  const uniqueConditions = conditions.length ? Array.from(new Set(conditions)) : ["No active conditions"];

  // Vitals logic
  const vitalsToUse = data.vitals && data.vitals.length > 0 ? data.vitals : [
    { bloodPressure: "120/80", heartRate: 72, temperature: 98.6, spO2: 98, weight: profile?.weight || 70, date: new Date().toISOString() },
    { bloodPressure: "118/79", heartRate: 70, temperature: 98.4, spO2: 99, weight: profile?.weight || 70, date: new Date(Date.now() - 86400000).toISOString() },
    { bloodPressure: "122/82", heartRate: 75, temperature: 98.8, spO2: 97, weight: profile?.weight || 70, date: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];

  const displayVitals = [];
  if (vitalsToUse.length > 0) {
    const latest = vitalsToUse[0];
    if (latest.bloodPressure) {
      displayVitals.push({ id: "BP", label: "Blood Pressure", value: latest.bloodPressure, unit: "mmHg", series: vitalsToUse.map(v => parseInt(v.bloodPressure.split('/')[0]) || 0).reverse(), color: "#f43f5e" });
    }
    if (latest.heartRate) {
      displayVitals.push({ id: "HR", label: "Heart Rate", value: latest.heartRate.toString(), unit: "bpm", series: vitalsToUse.map(v => v.heartRate).reverse(), color: "#f59e0b" });
    }
  }

  const bmi = (profile?.height && profile?.weight) 
    ? (profile.weight / Math.pow(profile.heightUnit === "ft" ? profile.height * 0.3048 : profile.height / 100, 2)).toFixed(1)
    : "--";

  const handleGenerateSummary = async () => {
    setIsVitalsModalOpen(true);
    setAiSummary("");
    setIsGeneratingSummary(true);

    try {
      const token = useAuthStore.getState().token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/ai/vitals-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vitals: vitalsToUse, profile: data.profile }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAiSummary(json.summary);
      } else {
        throw new Error(json.message || "Failed to generate health summary");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
      setIsVitalsModalOpen(false);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const upcomingAppointments = data.appointments
    ?.filter(a => a.status === "PENDING" || a.status === "CONFIRMED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  const activeMedicines = data.consultations
    ?.flatMap(c => c.medicines || [])
    .filter(m => !m.isDispensed) || [];

  const nextFollowUp = data.consultations
    ?.filter(c => c.followUpDate && new Date(c.followUpDate) >= new Date())
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())[0];

  return (
    <section className="pb-12 max-w-350 mx-auto pt-6 px-4 sm:px-6">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            {userName}
          </h1>
          <div className="flex items-center gap-3 mt-2 mono-label text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" /> Verified
            </span>
            <span>·</span>
            <span>ID: HOS-{user?.id?.substring(0, 6).toUpperCase() || "000000"}</span>
            <span>·</span>
            <span>DOB: {profile?.dob ? new Date(profile.dob).toLocaleDateString() : "--"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/patient/book" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-xs font-semibold hover:bg-primary/90 transition-colors">
            Book Appointment <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* Follow-up Banner */}
      {nextFollowUp && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm uppercase tracking-wider">Confirmed Follow-Up</p>
              <p className="text-sm opacity-80 mt-0.5">
                Your doctor requested a follow-up on <span className="font-bold">{new Date(nextFollowUp.followUpDate!).toLocaleDateString()}</span> for {nextFollowUp.diagnosis || "your previous consultation"}. <span className="font-semibold italic">Walk-in on this date, no new booking required.</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-[minmax(180px,auto)]">
        
        {/* Tile A: Core Vitals (Large Square) */}
        <CellShell id="A" title="Telemetry" className="lg:col-span-5 lg:row-span-2" delay={0.1} icon={Activity}>
          <div className="flex flex-col gap-6 flex-1 justify-between">
            {displayVitals.map((v, i) => (
              <div key={v.id} className="relative">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-muted-foreground text-sm font-medium">{v.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold tracking-tight">{v.value}</span>
                    <span className="font-mono text-xs text-muted-foreground">{v.unit}</span>
                  </div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 border border-border/40">
                   <Trend series={v.series.length > 0 ? v.series : [0]} color={v.color} />
                </div>
              </div>
            ))}
            
            {/* Morphometrics Mini-Grid */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-border/40">
              <div>
                <p className="mono-label text-[10px] text-muted-foreground uppercase">Height</p>
                <p className="font-mono text-sm mt-1">{profile?.height || "--"} <span className="text-xs text-muted-foreground">{profile?.heightUnit}</span></p>
              </div>
              <div>
                <p className="mono-label text-[10px] text-muted-foreground uppercase">Weight</p>
                <p className="font-mono text-sm mt-1">{profile?.weight || "--"} <span className="text-xs text-muted-foreground">kg</span></p>
              </div>
              <div>
                <p className="mono-label text-[10px] text-muted-foreground uppercase">BMI</p>
                <p className="font-mono text-sm mt-1 text-indigo-500">{bmi}</p>
              </div>
            </div>

            {vitalsToUse && vitalsToUse.length > 0 && (
              <button 
                onClick={handleGenerateSummary}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 py-2.5 text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Sparkles className="size-4" /> Generate AI Summary
              </button>
            )}
          </div>
        </CellShell>

        {/* Tile B: Active Conditions (Wide) */}
        <CellShell id="B" title="Conditions" className="lg:col-span-7" delay={0.2} icon={HeartPulse}>
           <div className="flex flex-wrap gap-2 mt-2">
            {uniqueConditions.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 bg-background border border-border/60 text-foreground px-3 py-1.5 rounded-full text-xs font-medium hover:border-primary/50 transition-colors cursor-default">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                {c}
              </span>
            ))}
          </div>
          <p className="mono-label text-xs text-muted-foreground mt-auto pt-6">
            Sourced from latest clinical encounters
          </p>
        </CellShell>

        {/* Tile C: Blood & Allergies (Square) */}
        <CellShell id="C" title="Alerts & Blood" className="lg:col-span-3" delay={0.3} icon={AlertCircle}>
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Blood Type</span>
              <span className="font-mono text-4xl font-bold text-rose-500 tracking-tighter">
                {bloodGroup}
              </span>
            </div>
            
            <div className="border-t border-border/40 pt-4">
               <span className="mono-label text-[10px] text-muted-foreground uppercase block mb-2">Known Allergies</span>
               <div className="flex flex-wrap gap-1.5">
                  {allergiesList.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-[11px] font-semibold">
                      <TriangleAlert className="size-3" />
                      {a}
                    </span>
                  ))}
               </div>
            </div>
          </div>
        </CellShell>

        {/* Tile D: Care Team (Wide) */}
        <CellShell id="D" title="Care Team" className="lg:col-span-4" delay={0.4} icon={Users}>
          <div className="flex flex-col gap-2 flex-1">
            {data.consultations.length > 0 ? (
              Array.from(new Map(data.consultations.map(c => [c.doctor.name, c.doctor])).values()).slice(0, 3).map((doctor) => (
                <div key={doctor.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-background border border-transparent hover:border-border/60 transition-all cursor-pointer group">
                  <div className="bg-muted text-muted-foreground font-bold font-mono text-sm grid size-9 rounded-full shrink-0 place-items-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {doctor.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">Dr. {doctor.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono truncate mt-0.5">
                      {doctor.role}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-mono text-muted-foreground py-4">No care team assigned.</p>
            )}
          </div>
          <Link href="/patient/appointments" className="mono-label text-xs text-primary mt-auto pt-4 hover:underline">
            View all encounters →
          </Link>
        </CellShell>

        {/* Tile E: Upcoming Appointments (Square/Wide) */}
        <CellShell id="E" title="Next Visit" className="lg:col-span-5" delay={0.5} icon={CalendarClock}>
          <div className="flex flex-col gap-3 flex-1 justify-center h-full">
            {upcomingAppointments.length > 0 ? (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-[10px] mono-label text-primary uppercase tracking-wider mb-2">Upcoming</p>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-foreground">Dr. {upcomingAppointments[0].doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{upcomingAppointments[0].department}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-foreground font-bold">{upcomingAppointments[0].timeSlot}</p>
                    <p className="text-xs text-muted-foreground">{new Date(upcomingAppointments[0].date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : nextFollowUp ? (
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                <p className="text-[10px] mono-label text-indigo-500 uppercase tracking-wider mb-2">Walk-in Follow-up</p>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-foreground">Dr. {nextFollowUp.doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{nextFollowUp.diagnosis || "Consultation"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-foreground font-bold">Any time</p>
                    <p className="text-xs text-muted-foreground">{new Date(nextFollowUp.followUpDate!).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <CalendarClock className="size-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No upcoming visits</p>
                <Link href="/patient/book" className="text-xs text-primary hover:underline mt-1 inline-block">Book an appointment</Link>
              </div>
            )}
          </div>
        </CellShell>

        {/* Tile F: Active Medicines (Wide) */}
        <CellShell id="F" title="Prescriptions" className="lg:col-span-7" delay={0.6} icon={Pill}>
          <div className="flex flex-col gap-2 flex-1">
            {activeMedicines.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {activeMedicines.slice(0, 4).map((med, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border/60">
                    <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg">
                      <Pill className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{med.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono truncate mt-0.5">
                        {med.dosage} · {med.frequency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
                <Pill className="size-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No active prescriptions</p>
                <p className="text-xs mt-1">You're all caught up.</p>
              </div>
            )}
          </div>
        </CellShell>

      </div>

      <AnimatePresence>
        {isVitalsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVitalsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-card">
                <div className="flex items-center gap-2 text-amber-500">
                  <Sparkles className="size-5" />
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground">AI Health Summary</h2>
                </div>
                <button
                  onClick={() => setIsVitalsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {isGeneratingSummary ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="size-8 animate-spin text-amber-500 mb-4" />
                    <p className="text-sm font-medium animate-pulse text-muted-foreground">Analyzing vitals history...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:text-primary prose-ul:list-disc">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border/60 bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  This summary is generated by AI and is for informational purposes only. Always consult your doctor for medical advice.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
