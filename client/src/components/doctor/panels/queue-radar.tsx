"use client";

import { motion } from "motion/react";
import { AppointmentRecord } from "@/lib/api/appointment";
import { useMemo } from "react";

export function QueueRadar({ appointments }: { appointments: AppointmentRecord[] }) {
  // Filter for upcoming appointments
  const upcoming = useMemo(() => {
    return appointments.filter(a => a.status === "PENDING" || a.status === "CONFIRMED");
  }, [appointments]);

  // Generate stable random angles and distances for blips based on ID so they don't jump around
  const blips = useMemo(() => {
    return upcoming.map((appt, i) => {
      // Use index and ID to generate pseudo-random position
      const hash = appt._id ? appt._id.charCodeAt(0) + appt._id.charCodeAt(appt._id.length - 1) : i;
      const angle = ((hash * 137.5) % 360) * (Math.PI / 180);
      
      // Distance from center: 20% to 90%
      const rPct = 20 + ((hash * 47) % 70); 
      
      const x = 50 + rPct * Math.cos(angle);
      const y = 50 + rPct * Math.sin(angle);
      
      const pat = typeof appt.patient === "object" && appt.patient ? appt.patient : null;
      const name = pat?.name || "Patient";

      return { id: appt._id, x, y, name, time: appt.timeSlot, status: appt.status };
    });
  }, [upcoming]);

  return (
    <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-full border-2 border-primary/20 bg-background/50 overflow-hidden shadow-[0_0_30px_rgba(var(--primary),0.1)] flex items-center justify-center">
      
      {/* Radar rings */}
      <div className="absolute inset-0 rounded-full border border-primary/10 m-[10%]" />
      <div className="absolute inset-0 rounded-full border border-primary/20 m-[25%]" />
      <div className="absolute inset-0 rounded-full border border-primary/30 m-[40%]" />
      
      {/* Crosshairs */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-primary/20" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-primary/20" />

      {/* Center node */}
      <div className="absolute size-3 rounded-full bg-primary shadow-[0_0_10px_var(--primary)] z-20" />

      {/* Sweeping Scanner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 z-10 rounded-full origin-center"
        style={{
          background: "conic-gradient(from 0deg, transparent 70%, rgba(34, 197, 94, 0.4) 100%)",
        }}
      >
        <div className="absolute right-0 top-0 bottom-1/2 left-1/2 border-r-[2px] border-primary" />
      </motion.div>

      {/* Blips */}
      {blips.map((blip) => (
        <div
          key={blip.id}
          className="absolute z-30 group"
          style={{ left: `${blip.x}%`, top: `${blip.y}%`, transform: "translate(-50%, -50%)" }}
        >
          {/* Pulsing dot */}
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-50">
            <p className="font-bold">{blip.name}</p>
            <p className="text-[10px] text-muted-foreground">{blip.time} • {blip.status}</p>
          </div>
        </div>
      ))}

      {/* Empty State Overlay */}
      {blips.length === 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-xs">
          <p className="text-sm font-medium text-muted-foreground mono-label uppercase">No Pending Queue</p>
        </div>
      )}
    </div>
  );
}
