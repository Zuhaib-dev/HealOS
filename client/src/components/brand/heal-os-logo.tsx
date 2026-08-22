"use client";

import { motion, useReducedMotion } from "motion/react";

type HealOSLogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: number;
};

/**
 * HealOS mark — a brass aperture ring (instrument iris) enclosing an
 * ECG trace that draws itself, with cross ticks as calibration marks.
 * Pure SVG, no raster assets.
 */
export function HealOSLogo({ className, showWordmark = true, size = 34 }: HealOSLogoProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0 overflow-visible"
      >
        {/* calibration ticks */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="24"
            y1="2.5"
            x2="24"
            y2={i % 3 === 0 ? "7" : "5"}
            stroke="currentColor"
            strokeWidth="1"
            className="text-accent"
            opacity={i % 3 === 0 ? 0.85 : 0.4}
            transform={`rotate(${i * 30} 24 24)`}
          />
        ))}

        {/* expanding pulse halos (heartbeat) */}
        {!reduce &&
          [0, 1.3].map((delay) => (
            <motion.circle
              key={delay}
              cx="24"
              cy="24"
              r="15"
              stroke="currentColor"
              strokeWidth="1"
              className="text-accent"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: [0.85, 1.45], opacity: [0, 0.45, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: delay + 1.2 }}
              style={{ transformOrigin: "24px 24px" }}
            />
          ))}

        {/* iris ring */}
        <motion.circle
          cx="24"
          cy="24"
          r="15"
          stroke="currentColor"
          strokeWidth="1.25"
          className="text-primary"
          initial={reduce ? false : { pathLength: 0, scale: 1, opacity: 1 }}
          animate={
            reduce
              ? false
              : { pathLength: 1, scale: [1, 1.06, 1, 1.03, 1], opacity: [1, 0.8, 1, 0.9, 1] }
          }
          transition={{
            pathLength: { duration: 1.2, ease: "easeInOut" },
            scale: { duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 1.2 },
            opacity: { duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 1.2 },
          }}
          style={{ transformOrigin: "24px 24px", rotate: -90 }}
        />

        <motion.circle
          cx="24"
          cy="24"
          r="19.5"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="2 6"
          className="text-accent"
          opacity={0.5}
          animate={reduce ? false : { rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "24px 24px" }}
        />

        {/* ECG trace */}
        <motion.path
          d="M9 24h5.5l2.5-6.5 3 13 3.2-9.5 2.3 3H39"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="square"
          strokeLinejoin="miter"
          className="text-foreground"
          initial={reduce ? false : { pathLength: 0, opacity: 1 }}
          animate={reduce ? false : { pathLength: 1, opacity: [1, 0.65, 1] }}
          transition={{
            pathLength: { duration: 1.6, delay: 0.3, ease: "easeInOut" },
            opacity: { duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 1.2 },
          }}
        />

        {/* live dot */}
        {!reduce && (
          <motion.circle
            cx="9"
            cy="24"
            r="1.9"
            className="fill-accent"
            initial={{ cx: 9, opacity: 0, scale: 1 }}
            animate={{ cx: [9, 39], opacity: [0, 1, 1, 0], scale: [1, 1.5, 1, 1.5, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear", delay: 1.4 }}
          />
        )}

      </svg>

      {showWordmark && (
        <span className="font-mono text-[0.95rem] font-bold tracking-[0.18em] uppercase">
          Heal<span className="text-brass">OS</span>
        </span>
      )}
    </span>
  );
}
