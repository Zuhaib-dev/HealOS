"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type HealOSLogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: number;
};

/**
 * HealOS mark — a brass aperture ring enclosing an ECG trace.
 * Idle is still. Hover redraws the trace and ticks the iris once.
 */
export function HealOSLogo({
  className,
  showWordmark = true,
  size = 34,
}: HealOSLogoProps) {
  const reduce = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState(false);
  const [traceKey, setTraceKey] = useState(0);
  const live = !reduce && hovered;

  return (
    <span
      className={`inline-flex items-center gap-3 ${className ?? ""}`}
      onMouseEnter={() => {
        setHovered(true);
        if (!reduce) setTraceKey((n) => n + 1);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0 overflow-visible"
      >
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

        {live ? (
          <motion.circle
            cx="24"
            cy="24"
            r="15"
            stroke="currentColor"
            strokeWidth="1"
            className="text-accent"
            initial={{ scale: 0.92, opacity: 0.35 }}
            animate={{ scale: 1.28, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "24px 24px" }}
          />
        ) : null}

        <circle
          cx="24"
          cy="24"
          r="15"
          stroke="currentColor"
          strokeWidth="1.25"
          className="text-primary"
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
          animate={reduce ? false : { rotate: live ? 28 : 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "24px 24px" }}
        />

        <motion.path
          d="M9 24h5.5l2.5-6.5 3 13 3.2-9.5 2.3 3H39"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="square"
          strokeLinejoin="miter"
          className="text-foreground"
          initial={reduce ? false : { pathLength: 0 }}
          animate={reduce ? false : { pathLength: 1 }}
          transition={{
            pathLength: {
              duration: live ? 0.55 : 1.2,
              ease: [0.22, 1, 0.36, 1],
            },
          }}
          key={traceKey}
        />

        {live ? (
          <motion.circle
            cx="9"
            cy="24"
            r="1.6"
            className="fill-accent"
            initial={{ cx: 9, opacity: 0 }}
            animate={{ cx: 39, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null}
      </svg>

      {showWordmark && (
        <span className="font-mono text-[0.95rem] font-bold tracking-[0.18em] uppercase">
          Heal<span className="text-brass">OS</span>
        </span>
      )}
    </span>
  );
}
