import { motion } from "motion/react";

/**
 * Animated SVG illustrations — every visual on the site is drawn, not photographed.
 * All strokes use currentColor / semantic token classes.
 */

const line = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.1, delay: 0.12 * i, ease: "easeInOut" as const },
  }),
};

/** Big hero instrument: ECG trace + telemetry ladder inside an aperture frame. */
export function VitalsInstrument({ className }: { className?: string }) {
  const trace =
    "M0 90 H40 L52 90 L58 58 L64 128 L72 74 L80 90 H120 L132 90 L138 66 L144 122 L152 78 L160 90 H240 L252 90 L258 60 L264 126 L272 76 L280 90 H360";

  return (
    <svg viewBox="0 0 360 180" fill="none" className={className} aria-hidden="true">
      {/* graph grid */}
      <g className="text-foreground" opacity={0.1}>
        {Array.from({ length: 19 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="180" stroke="currentColor" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 20} x2="360" y2={i * 20} stroke="currentColor" strokeWidth="0.5" />
        ))}
      </g>

      {/* baseline */}
      <line x1="0" y1="90" x2="360" y2="90" stroke="currentColor" strokeWidth="0.75" className="text-accent" opacity={0.35} />

      {/* ghost trace */}
      <path d={trace} stroke="currentColor" strokeWidth="1" className="text-primary" opacity={0.25} />

      {/* drawing trace */}
      <motion.path
        d={trace}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
        className="text-primary-glow"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />

      {/* travelling readout head */}
      <motion.g animate={{ x: [0, 360] }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}>
        <line x1="0" y1="8" x2="0" y2="172" stroke="currentColor" strokeWidth="1" className="text-accent" opacity={0.7} />
        <rect x="-1.5" y="6" width="3" height="3" className="fill-accent" />
      </motion.g>

      {/* corner brackets */}
      <g className="text-accent" stroke="currentColor" strokeWidth="1.25" opacity={0.8}>
        <path d="M2 14V2h12" />
        <path d="M358 14V2h-12" />
        <path d="M2 166v12h12" />
        <path d="M358 166v12h-12" />
      </g>
    </svg>
  );
}

/** Records: stacked patient chart sheets that shuffle into alignment. */
export function RecordsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" fill="none" className={className} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          initial={{ x: 10 - i * 6, y: 8 - i * 4, opacity: 0 }}
          whileInView={{ x: i * 8, y: i * 7, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.12 * i, ease: "easeOut" }}
        >
          <rect x="8" y="8" width="70" height="52" stroke="currentColor" strokeWidth="1" className="text-foreground" opacity={0.6} />
          <line x1="16" y1="20" x2="52" y2="20" stroke="currentColor" strokeWidth="1" className="text-accent" opacity={0.7} />
          <line x1="16" y1="30" x2="66" y2="30" stroke="currentColor" strokeWidth="1" className="text-foreground" opacity={0.35} />
          <line x1="16" y1="38" x2="58" y2="38" stroke="currentColor" strokeWidth="1" className="text-foreground" opacity={0.35} />
        </motion.g>
      ))}
    </svg>
  );
}

/** Scheduling: orbiting appointment slots around a day pivot. */
export function OrbitGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" fill="none" className={className} aria-hidden="true">
      <ellipse cx="60" cy="45" rx="46" ry="18" stroke="currentColor" strokeWidth="1" className="text-foreground" opacity={0.3} />
      <ellipse cx="60" cy="45" rx="30" ry="34" stroke="currentColor" strokeWidth="1" className="text-accent" opacity={0.35} />
      <circle cx="60" cy="45" r="5" className="fill-primary" />
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "60px 45px" }}>
        <rect x="103" y="42" width="6" height="6" className="fill-accent" />
      </motion.g>
      <motion.g animate={{ rotate: -360 }} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "60px 45px" }}>
        <rect x="57" y="8" width="6" height="6" className="fill-primary-glow" />
      </motion.g>
    </svg>
  );
}

/** Radiology: scan sweep across a sectioned body plate. */
export function ScanGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" fill="none" className={className} aria-hidden="true">
      <rect x="14" y="12" width="92" height="66" stroke="currentColor" strokeWidth="1" className="text-foreground" opacity={0.5} />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={20 + i * 8} y1="20" x2={20 + i * 8} y2="70" stroke="currentColor" strokeWidth="1" className="text-primary" opacity={0.28} />
      ))}
      <motion.rect
        y="12"
        width="18"
        height="66"
        className="fill-accent"
        opacity={0.28}
        animate={{ x: [14, 88, 14] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="60" cy="45" r="9" stroke="currentColor" strokeWidth="1.25" className="text-accent" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2.4, repeat: Infinity }} />
    </svg>
  );
}

/** Revenue: ledger bars that grow into place. */
export function LedgerGlyph({ className }: { className?: string }) {
  const bars = [26, 40, 33, 52, 44, 62, 58];
  return (
    <svg viewBox="0 0 120 90" fill="none" className={className} aria-hidden="true">
      <line x1="10" y1="76" x2="112" y2="76" stroke="currentColor" strokeWidth="1" className="text-foreground" opacity={0.5} />
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={14 + i * 14}
          width="8"
          initial={{ height: 0, y: 76 }}
          whileInView={{ height: h, y: 76 - h }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.08 * i, ease: "easeOut" }}
          className={i === bars.length - 1 ? "fill-accent" : "fill-primary"}
          opacity={i === bars.length - 1 ? 1 : 0.75}
        />
      ))}
    </svg>
  );
}

/** Compliance: interlocking shield built from drawn strokes. */
export function ShieldGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" fill="none" className={className} aria-hidden="true">
      <motion.path
        d="M60 10 L96 22 V48 C96 66 78 78 60 82 C42 78 24 66 24 48 V22 Z"
        stroke="currentColor"
        strokeWidth="1.25"
        className="text-primary"
        variants={line}
        custom={0}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      />
      <motion.path
        d="M44 46 L56 58 L78 34"
        stroke="currentColor"
        strokeWidth="2"
        className="text-accent"
        variants={line}
        custom={1}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      />
    </svg>
  );
}

/** Network: hospital sites linked by pulsing edges. */
export function NetworkGlyph({ className }: { className?: string }) {
  const nodes = [
    [18, 22],
    [60, 12],
    [102, 30],
    [30, 66],
    [76, 72],
  ] as const;
  const edges = [
    [0, 1],
    [1, 2],
    [0, 3],
    [3, 4],
    [1, 4],
    [2, 4],
  ] as const;

  return (
    <svg viewBox="0 0 120 90" fill="none" className={className} aria-hidden="true">
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke="currentColor"
          strokeWidth="1"
          className="text-primary"
          animate={{ opacity: [0.2, 0.85, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.35 }}
        />
      ))}
      {nodes.map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width="6" height="6" className={i === 1 ? "fill-accent" : "fill-foreground"} opacity={i === 1 ? 1 : 0.7} />
      ))}
    </svg>
  );
}

/** Intake load ladder for the "why" section — animated horizontal bars. */
export function LoadLadder({ className }: { className?: string }) {
  const rows = [
    { label: "Triage queue", before: 78, after: 24 },
    { label: "Chart lookup", before: 64, after: 12 },
    { label: "Report turnaround", before: 88, after: 31 },
    { label: "Claim rejection", before: 46, after: 9 },
  ];

  return (
    <div className={className}>
      {rows.map((row, i) => (
        <div key={row.label} className="hairline-b py-5">
          <div className="mono-label flex items-baseline justify-between text-muted-foreground">
            <span>{row.label}</span>
            <span className="text-brass">−{row.before - row.after}%</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <motion.div
              className="h-[3px] bg-foreground/25"
              initial={{ width: 0 }}
              whileInView={{ width: `${row.before}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1 * i, ease: "easeOut" }}
            />
            <motion.div
              className="bg-accent h-[3px]"
              initial={{ width: 0 }}
              whileInView={{ width: `${row.after}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1 * i + 0.25, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
