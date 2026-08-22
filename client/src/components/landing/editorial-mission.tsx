"use client";

/* Hallmark · macrostructure: Long Document · theme: Emerald Prestige
 * states: default
 * contrast: pass
 */

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function EditorialMission() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-100, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="relative py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6">
        
        {/* Header Block */}
        <header className="mb-24">
          <p className="font-mono text-sm text-emerald-500 uppercase tracking-widest mb-6">Our Mission</p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.1] mb-8">
            Software should not be the reason a <span className="text-emerald-500 font-serif italic">doctor</span> is late to a code blue.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            We started HealOS after watching brilliant clinicians spend 40% of their shift clicking through fragmented, legacy electronic health records. The system was broken. So we rewrote it.
          </p>
        </header>

        {/* Parallax Image Break */}
        <div className="relative h-100 w-full rounded-3xl overflow-hidden mb-24 bg-card border border-border flex items-center justify-center">
           <motion.div 
             style={{ y: y1, opacity }}
             className="absolute w-full h-[150%] bg-linear-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" 
           />
           <div className="text-center px-4">
             <p className="font-serif italic text-3xl md:text-5xl text-foreground/40 font-light">
               "The interface is the medicine."
             </p>
           </div>
        </div>

        {/* Narrative Content */}
        <article className="prose prose-lg prose-invert max-w-none text-muted-foreground">
          <h2 className="text-3xl font-semibold text-foreground mb-6">The Legacy Debt</h2>
          <p className="mb-10 leading-relaxed">
            For two decades, hospital software has been procured by administrators but used by clinicians. This misalignment created monolithic systems that prioritize billing codes over patient outcomes. A simple medication order required navigating seven different screens. 
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 bg-card border border-border rounded-2xl">
              <h3 className="text-xl font-semibold text-foreground mb-3">The Old Way</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2"><span className="text-rose-500">✕</span> Disconnected silos</li>
                <li className="flex gap-2"><span className="text-rose-500">✕</span> 3-second page loads</li>
                <li className="flex gap-2"><span className="text-rose-500">✕</span> High cognitive load</li>
              </ul>
            </div>
            <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
              <h3 className="text-xl font-semibold text-emerald-500 mb-3">The HealOS Way</h3>
              <ul className="space-y-2 text-sm text-emerald-500/80">
                <li className="flex gap-2"><span>✓</span> Unified clinical core</li>
                <li className="flex gap-2"><span>✓</span> Instantaneous routing</li>
                <li className="flex gap-2"><span>✓</span> Contextual awareness</li>
              </ul>
            </div>
          </div>

          <h2 className="text-3xl font-semibold text-foreground mb-6">Engineering for Crisis</h2>
          <p className="mb-10 leading-relaxed">
            When we engineered the core architecture, we didn't design for the calm Tuesday afternoon. We designed for the Saturday night trauma bay. The interface relies on distinct typographic hierarchies, dark contrast for low-light environments, and zero layout shift. Every pixel is intentional, because in a clinical setting, visual noise is a patient safety risk.
          </p>

          <blockquote className="border-l-4 border-emerald-500 pl-6 my-12 italic text-2xl text-foreground font-serif">
            "We aren't just building a database. We are building the central nervous system of the modern hospital."
          </blockquote>

          <p className="mb-10 leading-relaxed">
            Today, HealOS powers the clinical workflows of over 50 hospitals. But our mission remains the same: give time back to the people saving lives.
          </p>
        </article>

      </div>
    </section>
  );
}
