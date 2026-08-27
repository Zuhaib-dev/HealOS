"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Activity } from "lucide-react";

export function AnatomySelector({ onSelect }: { onSelect: (part: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const parts = [
    { id: "Head", d: "M 100 15 A 25 25 0 1 0 100 65 A 25 25 0 1 0 100 15 Z" },
    { id: "Neck", d: "M 90 65 L 110 65 L 115 80 L 85 80 Z" },
    { id: "Chest", d: "M 70 80 L 130 80 L 120 150 L 80 150 Z" },
    { id: "Abdomen", d: "M 80 155 L 120 155 L 110 210 L 90 210 Z" },
    { id: "Left Arm", d: "M 65 80 Q 40 130 30 200 L 45 200 Q 55 130 75 85 Z" },
    { id: "Right Arm", d: "M 135 80 Q 160 130 170 200 L 155 200 Q 145 130 125 85 Z" },
    { id: "Left Leg", d: "M 90 215 Q 70 280 75 380 L 95 380 Q 85 280 100 215 Z" },
    { id: "Right Leg", d: "M 110 215 Q 130 280 125 380 L 105 380 Q 115 280 100 215 Z" },
  ];

  return (
    <div className="relative w-full h-full p-6 rounded-2xl border border-primary/20 bg-card/40 flex flex-col items-center justify-center shadow-inner">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <Activity className="size-4 text-primary animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Biometric Scanner</span>
      </div>
      <div className="absolute top-4 right-4">
        <span className="text-[10px] mono-label text-muted-foreground">Click to tag</span>
      </div>

      <svg 
        viewBox="0 0 200 400" 
        className="w-full max-w-[180px] h-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] mt-6"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {parts.map((p) => {
          const isHovered = hovered === p.id;
          return (
            <motion.path
              key={p.id}
              d={p.d}
              stroke={isHovered ? "currentColor" : "currentColor"}
              strokeOpacity={isHovered ? 1 : 0.4}
              strokeWidth={isHovered ? 3 : 1.5}
              fill={isHovered ? "currentColor" : "transparent"}
              fillOpacity={isHovered ? 0.2 : 0}
              className="text-primary cursor-crosshair transition-all duration-300"
              style={{ filter: isHovered ? "url(#glow)" : "none" }}
              onHoverStart={() => setHovered(p.id)}
              onHoverEnd={() => setHovered(null)}
              onClick={() => onSelect(p.id)}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          );
        })}
      </svg>
      
      <div className="mt-6 h-6 flex items-center justify-center w-full bg-primary/5 rounded-md border border-primary/10">
        <p className="text-xs font-mono font-medium text-primary/80 tracking-wide">
          {hovered ? `> TARGET: ${hovered.toUpperCase()}` : "> SYSTEM STANDBY"}
        </p>
      </div>
    </div>
  );
}
