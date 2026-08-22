"use client";

/* Hallmark · macrostructure: Bento Grid · genre: modern-minimal
 * states: hover
 * contrast: pass
 */

import { motion } from "motion/react";
import { UserPlus, Activity, Landmark, ShieldCheck } from "lucide-react";

// Reusable Cell Shell
function MetricCard({
  title,
  value,
  subValue,
  note,
  icon: Icon,
  delay = 0,
  className = ""
}: {
  title: string;
  value: string;
  subValue?: string;
  note: string;
  icon: any;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`group relative flex flex-col p-6 rounded-3xl bg-card/60 border border-border/60 shadow-sm hover:shadow-md hover:bg-card/80 transition-all overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between mb-6">
        <span className="mono-label text-muted-foreground uppercase tracking-wider font-semibold text-xs">
          {title}
        </span>
        <Icon className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
      <div className="relative z-10 flex flex-col justify-end flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-5xl font-bold tracking-tight text-foreground">{value}</span>
          {subValue && <span className="font-mono text-sm font-semibold text-muted-foreground">{subValue}</span>}
        </div>
        <p className="text-sm font-medium text-muted-foreground mt-4">{note}</p>
      </div>
    </motion.div>
  );
}

export default function ReceptionOverview() {
  return (
    <section className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
          Good morning.
        </h1>
        <p className="text-muted-foreground mt-2">
          Patient registration, OPD tokens, and billing overview for today.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(240px,auto)] flex-1">
        
        <MetricCard
          title="Registrations today"
          value="182"
          note="41 new · 141 repeat"
          icon={UserPlus}
          delay={0.1}
          className="lg:col-span-2"
        />

        <MetricCard
          title="Tokens waiting"
          value="23"
          note="avg wait 14 min"
          icon={Activity}
          delay={0.2}
          className="lg:col-span-1"
        />

        <MetricCard
          title="Collections"
          value="₹4.82 L"
          subValue="total"
          note="cash + card + UPI"
          icon={Landmark}
          delay={0.3}
          className="lg:col-span-1"
        />

        <MetricCard
          title="Insurance captured"
          value="96.4"
          subValue="%"
          note="target 95%"
          icon={ShieldCheck}
          delay={0.4}
          className="lg:col-span-4"
        />
        
      </div>
    </section>
  );
}
