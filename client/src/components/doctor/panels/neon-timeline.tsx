"use client";

import { motion } from "motion/react";
import { AppointmentRecord } from "@/lib/api/appointment";
import { useMemo } from "react";

export function NeonTimeline({ appointments }: { appointments: AppointmentRecord[] }) {
  // Sort and filter appointments for today
  const sorted = useMemo(() => {
    return appointments
      .filter(a => a.status === "PENDING" || a.status === "CONFIRMED")
      .sort((a, b) => {
        // Simple sort by timeSlot if it's formatted well (e.g. "09:00 AM")
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [appointments]);

  if (sorted.length === 0) {
    return (
      <div className="w-full h-full min-h-40 flex items-center justify-center rounded-2xl border border-border/50 bg-card/30">
        <p className="text-muted-foreground mono-label uppercase text-sm">No timeline events</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative py-12 px-6 overflow-x-auto overflow-y-hidden bg-card/40 rounded-2xl border border-primary/10 shadow-inner flex items-center">
      <div className="flex items-center justify-between min-w-full relative">
        
        {/* The Base Line Background */}
        <div className="absolute left-4 right-4 h-0.5 top-1/2 -translate-y-1/2 bg-primary/20 rounded-full" />
        
        {/* The Glowing Neon Progress Line */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute left-4 h-0.5 top-1/2 -translate-y-1/2 bg-primary shadow-[0_0_12px_rgba(16,185,129,0.8)] rounded-full z-0" 
        />

        {/* Nodes */}
        {sorted.map((appt, i) => {
          const pat = typeof appt.patient === "object" && appt.patient ? appt.patient : null;
          const name = pat?.name || "Patient";
          
          return (
            <div key={appt._id} className="relative z-10 flex flex-col items-center mx-4 group cursor-pointer">
              {/* Time Label (top) */}
              <div className="absolute bottom-full mb-4 whitespace-nowrap transition-all duration-300 transform group-hover:-translate-y-1">
                <p className="mono-label text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{appt.timeSlot}</p>
              </div>

              {/* Glowing Node */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 300, damping: 20 }}
                className="w-5 h-5 rounded-full bg-background border-[3px] border-primary shadow-[0_0_10px_rgba(16,185,129,0.8)] group-hover:shadow-[0_0_20px_rgba(16,185,129,1)] transition-shadow duration-300"
              />

              {/* Patient Info (bottom) */}
              <div className="absolute top-full mt-4 whitespace-nowrap text-center transition-all duration-300 transform group-hover:translate-y-1">
                <p className="text-sm font-semibold text-foreground">{name}</p>
                <p className="text-[10px] text-muted-foreground mono-label mt-1">{appt.type}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
