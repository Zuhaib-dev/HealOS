"use client";

/* Hallmark · macrostructure: Workbench · theme: Emerald Prestige
 * states: default · hover · focus · active
 * contrast: pass
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Stethoscope, 
  Activity, 
  Pill, 
  Microscope, 
  Clock, 
  ShieldCheck, 
  Users, 
  ClipboardList 
} from "lucide-react";

const features = [
  {
    id: "clinical",
    label: "Clinical Core",
    icon: Stethoscope,
    title: "Surgical precision in patient management.",
    description: "Access longitudinal records, active treatment plans, and real-time vital streams in a unified command center. Designed to reduce cognitive load during critical care.",
    metrics: [
      { label: "Data sync", value: "< 50ms" },
      { label: "Uptime", value: "99.99%" },
    ],
    color: "bg-emerald-500/10 text-emerald-500",
    border: "border-emerald-500/20",
  },
  {
    id: "pharmacy",
    label: "Pharmacy & Dispensing",
    icon: Pill,
    title: "Automated inventory and eMAR validation.",
    description: "Close the loop on medication administration. Real-time stock decrements, automated refill alerts, and strict dosage verification protocols.",
    metrics: [
      { label: "Error reduction", value: "87%" },
      { label: "Stock alerts", value: "Real-time" },
    ],
    color: "bg-cyan-500/10 text-cyan-500",
    border: "border-cyan-500/20",
  },
  {
    id: "radiology",
    label: "Radiology PACS",
    icon: Activity,
    title: "DICOM integration at the speed of thought.",
    description: "Direct viewing of high-res diagnostic imagery. Complete study archiving, reporting workflows, and critical finding escalations.",
    metrics: [
      { label: "Render speed", value: "60fps" },
      { label: "Storage", value: "Unlimited" },
    ],
    color: "bg-indigo-500/10 text-indigo-500",
    border: "border-indigo-500/20",
  },
  {
    id: "lab",
    label: "Laboratory (LIS)",
    icon: Microscope,
    title: "From phlebotomy to verified result.",
    description: "Complete tracking of accessioning, auto-analyzer interfacing, and critical value alerting. Never lose a sample again.",
    metrics: [
      { label: "Throughput", value: "10k/day" },
      { label: "Interface", value: "HL7" },
    ],
    color: "bg-rose-500/10 text-rose-500",
    border: "border-rose-500/20",
  },
];

export function WorkbenchFeatures() {
  const [activeFeature, setActiveFeature] = useState(features[0].id);

  return (
    <section className="relative px-6 py-24 md:px-12 lg:px-24 max-w-7xl mx-auto">
      <div className="mb-16">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
          The Clinical <span className="text-emerald-500 font-serif italic">Workbench</span>.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          We rebuilt hospital infrastructure from first principles. 
          Stop clicking through legacy tabs and start treating patients with a unified suite of tools.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Sidebar (Navigation) */}
        <aside className="lg:w-1/3 flex flex-col gap-2">
          {features.map((f) => {
            const Icon = f.icon;
            const isActive = activeFeature === f.id;
            
            return (
              <button
                key={f.id}
                onClick={() => setActiveFeature(f.id)}
                className={`group relative flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 text-left ${
                  isActive 
                    ? "bg-card border border-border shadow-sm" 
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute inset-0 rounded-xl bg-card border border-border shadow-sm"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className={`relative z-10 flex items-center justify-center size-10 rounded-lg ${f.color} ${f.border} border`}>
                  <Icon className="size-5" />
                </div>
                
                <div className="relative z-10">
                  <h3 className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground transition-colors"}`}>
                    {f.label}
                  </h3>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Content Area (Display) */}
        <div className="lg:w-2/3 min-h-100">
          <AnimatePresence mode="wait">
            {features.map((f) => {
              if (f.id !== activeFeature) return null;
              
              const Icon = f.icon;

              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-sm h-full flex flex-col"
                >
                  <div className={`inline-flex items-center justify-center size-14 rounded-2xl ${f.color} ${f.border} border mb-8`}>
                    <Icon className="size-7" />
                  </div>
                  
                  <h2 className="text-3xl font-semibold text-foreground mb-4">
                    {f.title}
                  </h2>
                  
                  <p className="text-muted-foreground text-lg mb-12 max-w-xl">
                    {f.description}
                  </p>

                  <div className="mt-auto grid grid-cols-2 gap-8 pt-8 border-t border-border/50">
                    {f.metrics.map((m, idx) => (
                      <div key={idx}>
                        <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-1">
                          {m.label}
                        </p>
                        <p className="text-3xl font-medium text-foreground">
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
