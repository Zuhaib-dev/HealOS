import type { ReactNode } from "react";
import { motion } from "motion/react";

export type Tone = "ok" | "warn" | "bad" | "mute" | "info";

const toneMap: Record<Tone, string> = {
  ok: "bg-accent/12 text-brass",
  warn: "bg-foreground/[0.06] text-foreground",
  bad: "bg-destructive/12 text-destructive",
  mute: "bg-foreground/[0.04] text-muted-foreground",
  info: "bg-accent/8 text-foreground",
};

export function Pill({ children, tone = "mute" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`mono-label px-2 py-1 ${toneMap[tone]}`}>{children}</span>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`mono-label text-muted-foreground px-4 py-3 text-left font-normal ${className}`}>{children}</th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 align-middle text-sm ${className}`}>{children}</td>;
}

export function StatGrid({
  stats,
  cols = 4,
}: {
  stats: { label: string; value: string; note: string }[];
  cols?: 3 | 4 | 5;
}) {
  const gridCols = cols === 3 ? "lg:grid-cols-3" : cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return (
    <div
      className={`grid gap-px sm:grid-cols-2 ${gridCols}`}
      style={{ background: "var(--hairline)" }}
    >
      {stats.map((s) => (
        <div key={s.label} className="bg-background p-5">
          <p className="mono-label text-muted-foreground">{s.label}</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
          <p className="mono-label text-muted-foreground mt-1">{s.note}</p>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({
  values,
  height = 34,
  tone = "accent",
}: {
  values: number[];
  height?: number;
  tone?: "accent" | "bad";
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = height - 3 - ((v - min) / span) * (height - 6);
      return `${x},${y}`;
    })
    .join(" ");
  const stroke = tone === "bad" ? "var(--color-destructive)" : "var(--color-accent)";
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-8 w-full">
      <motion.polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

export function LiveDot({ tone = "ok" }: { tone?: "ok" | "bad" }) {
  return (
    <span
      className={`inline-block size-1.5 animate-pulse rounded-full ${
        tone === "bad" ? "bg-destructive" : "bg-accent"
      }`}
    />
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`hairline relative h-6 w-11 shrink-0 transition-colors ${on ? "bg-accent/25" : "bg-foreground/[0.04]"}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute top-[3px] size-4 ${on ? "bg-accent right-[3px]" : "bg-muted-foreground left-[3px]"}`}
      />
    </button>
  );
}

export function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-6 sm:px-8 ${className}`}>{children}</div>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`hairline p-5 ${className}`}>{children}</div>;
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--hairline)" strokeWidth="4" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="4"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * Math.min(value, 100)) / 100 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div>
        <p className="font-mono text-xl font-bold">{value}%</p>
        <p className="mono-label text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
