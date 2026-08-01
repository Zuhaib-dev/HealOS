import { motion } from "motion/react";

/**
 * Animated switchboard glyph — a brass patch panel routing an inbound signal
 * into three department lines. Pure SVG, no raster assets.
 */
export function SwitchboardGlyph({ className }: { className?: string }) {
  const lines = [
    { d: "M 40 110 C 130 110 150 46 250 46", delay: 0 },
    { d: "M 40 110 C 130 110 150 110 250 110", delay: 0.9 },
    { d: "M 40 110 C 130 110 150 174 250 174", delay: 1.8 },
  ];

  return (
    <svg
      viewBox="0 0 300 220"
      className={className}
      fill="none"
      role="img"
      aria-label="Signal routed from one inbound line into three department lines"
    >
      <defs>
        <linearGradient id="sb-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* graph ticks */}
      {Array.from({ length: 7 }).map((_, i) => (
        <line
          key={i}
          x1={0}
          x2={300}
          y1={16 + i * 31}
          y2={16 + i * 31}
          stroke="var(--hairline)"
          strokeWidth="1"
        />
      ))}

      {/* inbound trunk */}
      <line x1="0" y1="110" x2="40" y2="110" stroke="var(--hairline-strong)" strokeWidth="1.5" />
      <motion.circle
        cx="40"
        cy="110"
        r="5"
        fill="var(--accent)"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="40"
        cy="110"
        r="5"
        stroke="var(--accent)"
        strokeWidth="1"
        fill="none"
        animate={{ r: [5, 22], opacity: [0.6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
      />

      {lines.map((l, i) => (
        <g key={i}>
          <path d={l.d} stroke="var(--hairline-strong)" strokeWidth="1.25" />
          <motion.path
            d={l.d}
            stroke="url(#sb-brass)"
            strokeWidth="2"
            strokeDasharray="34 400"
            initial={{ strokeDashoffset: 400 }}
            animate={{ strokeDashoffset: [400, 0] }}
            transition={{ duration: 2.7, repeat: Infinity, ease: "linear", delay: l.delay }}
          />
          {/* department port */}
          <rect
            x="250"
            y={l.d.includes("46") ? 34 : l.d.includes("174") ? 162 : 98}
            width="24"
            height="24"
            stroke="var(--hairline-strong)"
            strokeWidth="1"
          />
          <motion.rect
            x="256"
            y={(l.d.includes("46") ? 34 : l.d.includes("174") ? 162 : 98) + 6}
            width="12"
            height="12"
            fill="var(--accent)"
            animate={{ opacity: [0.15, 0.9, 0.15] }}
            transition={{ duration: 2.7, repeat: Infinity, delay: l.delay + 1.2 }}
          />
        </g>
      ))}
    </svg>
  );
}

/** Animated site map — offices as pulsing nodes on a wire globe grid. */
export function SiteMapGlyph({ className }: { className?: string }) {
  const nodes = [
    { x: 92, y: 78, label: "SFO" },
    { x: 178, y: 62, label: "LON" },
    { x: 236, y: 112, label: "BLR" },
    { x: 300, y: 88, label: "SIN" },
  ];

  return (
    <svg viewBox="0 0 360 180" className={className} fill="none" role="img" aria-label="Global deployment sites">
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 45} y1="0" x2={i * 45} y2="180" stroke="var(--hairline)" />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 45} x2="360" y2={i * 45} stroke="var(--hairline)" />
      ))}

      {nodes.slice(0, -1).map((n, i) => (
        <motion.line
          key={`c${i}`}
          x1={n.x}
          y1={n.y}
          x2={nodes[i + 1]!.x}
          y2={nodes[i + 1]!.y}
          stroke="var(--accent)"
          strokeOpacity="0.35"
          strokeDasharray="4 6"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {nodes.map((n, i) => (
        <g key={n.label}>
          <motion.circle
            cx={n.x}
            cy={n.y}
            r="4"
            fill="var(--accent)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4 }}
          />
          <motion.circle
            cx={n.x}
            cy={n.y}
            r="4"
            stroke="var(--accent)"
            fill="none"
            animate={{ r: [4, 18], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
          />
          <text
            x={n.x + 10}
            y={n.y - 8}
            fill="currentColor"
            className="fill-muted-foreground"
            fontSize="9"
            fontFamily="var(--font-mono, monospace)"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
