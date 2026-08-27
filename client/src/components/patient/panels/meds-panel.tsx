"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Download,
  Eye,
  FileText,
  Share2,
  TriangleAlert,
  Video,
  MapPin,
  X,
  Send,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  fetchAvailableDoctorsApi,
  bookAppointmentApi,
  fetchPatientAppointmentsApi,
  updateAppointmentStatusApi,
  DoctorListItem,
  AppointmentRecord,
} from "@/lib/api/appointment";
import {
  fetchPatientProfileApi,
  updatePatientProfileApi,
  PatientProfileData,
} from "@/lib/api/onboarding";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { fetchPatientDashboardApi, PatientDashboardData, payInvoiceApi } from "@/lib/api/patient";
import { getSocket } from "@/lib/socket";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";

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

/** Animated trend line — drawn, never an image. */
function Trend({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 30 - ((v - min) / Math.max(0.001, max - min)) * 24 - 3;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full">
      <motion.polyline
        points={pts}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

/* ---------- 05 meds ---------- */

export function MedsPanel() {
  const { data, isLoading } = usePatientDashboard();

  // Helper to parse duration string (e.g. "5 days", "1 week", "10") into number of days
  const parseDurationDays = (dur: string) => {
    if (!dur) return 30; // default
    const num = parseInt(dur.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return 30;
    if (dur.toLowerCase().includes("week")) return num * 7;
    if (dur.toLowerCase().includes("month")) return num * 30;
    return num;
  };

  // Keep a unique ID for each medicine for the checklist.
  const allMeds = (data?.consultations || []).flatMap(c => 
    (c.medicines || []).map((m: any, idx: number) => {
      const createdAt = new Date(c.createdAt);
      const durationDays = parseDurationDays(m.duration);
      
      const expiryDate = new Date(createdAt);
      expiryDate.setDate(createdAt.getDate() + durationDays);
      
      // If end of day of expiry is still in the future, it's active
      const isActive = new Date() <= expiryDate;

      return {
        id: `${c._id}-${idx}`,
        name: m.name,
        dose: m.dosage,
        freq: m.frequency,
        duration: m.duration,
        started: createdAt.toLocaleDateString(),
        prescriber: c.doctor?.name ? `Dr. ${c.doctor.name}` : "Doctor",
        state: isActive ? "active" : "inactive",
        instructions: m.instructions
      };
    })
  );

  const activeMeds = allMeds.filter(m => m.state === "active");

  // Local storage for daily adherence
  const [takenMeds, setTakenMeds] = useState<Record<string, boolean>>({});
  const todayKey = new Date().toLocaleDateString();

  useEffect(() => {
    const saved = localStorage.getItem(`meds_taken_${todayKey}`);
    if (saved) {
      try {
        setTakenMeds(JSON.parse(saved));
      } catch (e) {}
    }
  }, [todayKey]);

  const toggleTaken = (id: string) => {
    const next = { ...takenMeds, [id]: !takenMeds[id] };
    setTakenMeds(next);
    localStorage.setItem(`meds_taken_${todayKey}`, JSON.stringify(next));
    if (next[id]) {
      toast.success("Medication marked as taken!");
    }
  };

  return (
    <section className="space-y-8 pb-12">
      <PanelHeader
        index="05 / medications"
        title="My medications"
        note="Track your daily schedule and view past prescriptions."
      />

      {/* TODAY'S SCHEDULE CHECKLIST */}
      <div className="px-4 sm:px-6 lg:px-8">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Check className="size-5 text-emerald-500" />
          Today's Schedule
        </h3>
        
        {activeMeds.length === 0 ? (
          <div className="bg-card/40 border border-border/50 rounded-2xl p-8 text-center">
            <p className="text-muted-foreground mono-label uppercase text-sm">No active medications scheduled for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMeds.map((m) => {
              const isTaken = !!takenMeds[m.id];
              return (
                <div 
                  key={m.id}
                  className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                    isTaken 
                    ? "bg-emerald-500/10 border-emerald-500/30" 
                    : "bg-card border-border/60 shadow-sm hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className={`font-bold text-lg ${isTaken ? "text-emerald-700 dark:text-emerald-400 line-through opacity-70" : "text-foreground"}`}>
                        {m.name}
                      </h4>
                      <p className="text-sm font-medium text-muted-foreground">{m.dose} • {m.freq}</p>
                    </div>
                    <button
                      onClick={() => toggleTaken(m.id)}
                      className={`shrink-0 flex items-center justify-center size-8 rounded-full border-2 transition-colors ${
                        isTaken 
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary/20"
                      }`}
                    >
                      <Check className={`size-5 ${isTaken ? "opacity-100" : "opacity-0"}`} />
                    </button>
                  </div>
                  {m.instructions && (
                    <div className="mt-4 p-2.5 bg-background/50 rounded-lg border border-border/40">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Instructions:</span> {m.instructions}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ALL MEDICATIONS LIST */}
      <div className="mt-12 px-4 sm:px-6 lg:px-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Prescription History</h3>
        <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-border/60" style={{ background: "var(--hairline)" }}>
          {allMeds.length === 0 && (
            <div className="bg-background p-8 text-center mono-label text-xs text-muted-foreground">
              No medications found.
            </div>
          )}
          {allMeds.map((m) => (
            <div
              key={m.id}
              className={`bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8 transition-colors ${
                m.state === "inactive" ? "opacity-60 grayscale-[0.5]" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{m.name}</p>
                <p className="mono-label text-muted-foreground mt-1 text-[11px]">
                  {m.dose} · {m.freq} · prescribed {m.started} · {m.prescriber}
                </p>
              </div>
              <Pill tone={m.state === "active" ? "ok" : "mute"}>{m.state.toUpperCase()}</Pill>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
