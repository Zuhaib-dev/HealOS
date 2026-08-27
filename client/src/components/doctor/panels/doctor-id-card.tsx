"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { UserCheck, ShieldCheck, Stethoscope } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

export interface DoctorIDCardProps {
  name: string;
  department: string;
  specialization: string;
  licenseNumber: string;
  avatarUrl: string | null;
}

export function DoctorIDCard({ name, department, specialization, licenseNumber, avatarUrl }: DoctorIDCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);
  
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["-100%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["-100%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: "1000px" }} className="w-full max-w-sm mx-auto p-4 flex items-center justify-center">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full aspect-2/3 max-w-[320px] rounded-2xl border border-white/20 dark:border-white/10 bg-linear-to-br from-card to-card/50 backdrop-blur-xl shadow-2xl overflow-hidden group"
      >
        {/* Holographic Glare Overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay"
          style={{
            background: "radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%)",
            x: glareX,
            y: glareY,
            scale: 2,
          }}
        />

        {/* Card Header Background */}
        <div 
          className="absolute top-0 inset-x-0 h-32 bg-primary/20 backdrop-blur-md border-b border-primary/20"
        />
        
        <div className="relative z-10 h-full flex flex-col p-6 items-center">
          {/* Logo / Header text */}
          <div 
            className="w-full flex items-center justify-between mb-8"
            style={{ transform: "translateZ(30px)" }}
          >
            <span className="text-xs font-bold tracking-widest text-primary uppercase">HealOS</span>
            <ShieldCheck className="size-5 text-primary" />
          </div>

          {/* Avatar */}
          <div 
            className="relative size-32 rounded-full border-4 border-background shadow-xl overflow-hidden mb-6 flex items-center justify-center bg-muted"
            style={{ transform: "translateZ(50px)" }}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill sizes="128px" className="object-cover" />
            ) : (
              <UserCheck className="size-12 text-muted-foreground/50" />
            )}
          </div>

          {/* Info */}
          <div 
            className="flex flex-col items-center text-center space-y-1.5 w-full"
            style={{ transform: "translateZ(40px)" }}
          >
            <h3 className="font-bold text-xl text-foreground truncate w-full">
              {name || "Dr. Your Name"}
            </h3>
            <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                {department || "Department"}
                </p>
            </div>
            <p className="text-sm text-muted-foreground truncate w-full mt-2">
              {specialization || "Specialization"}
            </p>
          </div>

          <div className="flex-1" />

          {/* Footer Barcode/Details */}
          <div 
            className="w-full border-t border-border/50 pt-4 mt-6 flex justify-between items-end"
            style={{ transform: "translateZ(20px)" }}
          >
            <div className="space-y-1 text-left">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">License No.</p>
              <p className="text-xs font-mono font-semibold">{licenseNumber || "UNVERIFIED"}</p>
            </div>
            
            <Stethoscope className="size-6 text-muted-foreground/30" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
