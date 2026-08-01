import { motion, useReducedMotion } from "motion/react";

/**
 * Animated hospital floor schematic — a patient token travels the full
 * admission path while each department bay lights up as it passes.
 * Pure SVG, hand-drawn, no raster assets.
 */

type Bay = {
  x: number;
  y: number;
  w: number;
  h: number;
  code: string;
  name: string;
};

const bays: Bay[] = [
  { x: 20, y: 40, w: 110, h: 84, code: "A1", name: "Intake" },
  { x: 170, y: 24, w: 120, h: 60, code: "B2", name: "Triage" },
  { x: 170, y: 116, w: 120, h: 60, code: "B4", name: "Imaging" },
  { x: 330, y: 40, w: 118, h: 84, code: "C3", name: "Theatre" },
  { x: 488, y: 24, w: 112, h: 60, code: "D1", name: "Ward" },
  { x: 488, y: 116, w: 112, h: 60, code: "D5", name: "Discharge" },
];

/** Corridor spine the patient token follows. */
const PATH =
  "M40 82 H150 L150 54 H310 L310 148 H150 L150 82 H310 L310 54 H470 L470 146 H620";

export function JourneyFloorplan({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <svg viewBox="0 0 640 200" fill="none" className={className} aria-hidden="true">
      {/* graph paper */}
      <g className="text-foreground" opacity={0.08}>
        {Array.from({ length: 33 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="200" stroke="currentColor" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 20} x2="640" y2={i * 20} stroke="currentColor" strokeWidth="0.5" />
        ))}
      </g>

      {/* corridor — ghost then drawn */}
      <path d={PATH} stroke="currentColor" strokeWidth="1" className="text-foreground" opacity={0.18} />
      <motion.path
        d={PATH}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="4 5"
        className="text-accent"
        opacity={0.6}
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={reduce ? {} : { pathLength: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 2.4, ease: "easeInOut" }}
      />

      {/* department bays */}
      {bays.map((b, i) => (
        <motion.g
          key={b.code}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={reduce ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.12 * i }}
        >
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            stroke="currentColor"
            strokeWidth="1"
            className="text-foreground"
            opacity={0.45}
          />
          {/* occupancy fill that breathes */}
          <motion.rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            className="fill-primary"
            animate={reduce ? {} : { opacity: [0.05, 0.16, 0.05] }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
          />
          {/* corner ticks */}
          <g stroke="currentColor" strokeWidth="1" className="text-brass" opacity={0.9}>
            <path d={`M${b.x} ${b.y + 7}V${b.y}h7`} />
            <path d={`M${b.x + b.w} ${b.y + 7}V${b.y}h-7`} />
            <path d={`M${b.x} ${b.y + b.h - 7}V${b.y + b.h}h7`} />
            <path d={`M${b.x + b.w} ${b.y + b.h - 7}V${b.y + b.h}h-7`} />
          </g>
          <text
            x={b.x + 8}
            y={b.y + b.h - 10}
            className="fill-foreground font-mono"
            style={{ fontSize: 9, letterSpacing: "0.14em" }}
            opacity={0.75}
          >
            {b.code} · {b.name.toUpperCase()}
          </text>
          {/* bed ticks */}
          {Array.from({ length: Math.floor(b.w / 22) }).map((_, k) => (
            <motion.rect
              key={k}
              x={b.x + 9 + k * 22}
              y={b.y + 12}
              width="12"
              height="5"
              className="fill-accent"
              animate={reduce ? {} : { opacity: [0.25, 0.9, 0.25] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: (i + k) * 0.3 }}
            />
          ))}
        </motion.g>
      ))}

      {/* patient token travelling the corridor */}
      {!reduce && (
        <>
          <motion.g
            style={{ offsetPath: `path("${PATH}")`, offsetRotate: "0deg" } as never}
            animate={{ offsetDistance: ["0%", "100%"] } as never}
            transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
          >
            <circle r="9" className="fill-accent" opacity={0.18} />
            <circle r="4" className="fill-accent" />
          </motion.g>
          <motion.g
            style={{ offsetPath: `path("${PATH}")` } as never}
            animate={{ offsetDistance: ["0%", "100%"] } as never}
            transition={{ duration: 11, repeat: Infinity, ease: "linear", delay: 4.5 }}
            opacity={0.6}
          >
            <circle r="3" className="fill-primary-glow" />
          </motion.g>
        </>
      )}

      {/* frame brackets */}
      <g className="text-accent" stroke="currentColor" strokeWidth="1.25" opacity={0.75}>
        <path d="M2 14V2h12" />
        <path d="M638 14V2h-12" />
        <path d="M2 186v12h12" />
        <path d="M638 186v12h-12" />
      </g>
    </svg>
  );
}
