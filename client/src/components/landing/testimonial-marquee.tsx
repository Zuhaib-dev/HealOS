"use client";

/* Hallmark · macrostructure: Marquee Hero · theme: Emerald Prestige
 * states: default · hover
 * contrast: pass
 */

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "HealOS cut our average triage-to-treatment time by 40%. The unified dashboard means my nurses aren't hunting for lab results anymore—they're treating patients.",
    author: "Dr. Sarah Chen",
    role: "Chief of Emergency Medicine",
    hospital: "Metropolitan General",
  },
  {
    quote: "The DICOM viewer integrated directly into the patient chart is a game changer. I can review high-res scans during rounds without returning to a workstation.",
    author: "Dr. James Wilson",
    role: "Lead Radiologist",
    hospital: "St. Jude's Research",
  },
  {
    quote: "Pharmacy dispensing errors dropped to near-zero within a month of deployment. The closed-loop eMAR system is bulletproof.",
    author: "Amanda Torres",
    role: "Director of Pharmacy",
    hospital: "Valley Health Network",
  },
  {
    quote: "Finally, a hospital system that feels like it was designed this decade. The interface is intuitive, fast, and doesn't get in the way of clinical work.",
    author: "Dr. Robert Singh",
    role: "Chief Medical Officer",
    hospital: "Pacific Care",
  },
  {
    quote: "Our lab turnaround times improved dramatically. The HL7 interface handles 10,000+ daily accessions without breaking a sweat.",
    author: "Elena Rostova",
    role: "Head of Pathology",
    hospital: "Northern Medical Center",
  },
];

export function TestimonialMarquee() {
  // Duplicate array for seamless infinite scroll
  const scrollItems = [...testimonials, ...testimonials];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-150 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center px-6 mb-20 relative z-10">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground mb-6">
          Trusted by the <br className="hidden md:block" />
          <span className="text-emerald-500 font-serif italic">frontline</span> of medicine.
        </h1>
        <p className="text-lg text-muted-foreground">
          Don't just take our word for it. Hear from the clinicians, directors, and technicians who rely on HealOS every single day.
        </p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <motion.div
          className="flex whitespace-nowrap gap-6 px-3"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 40,
          }}
        >
          {scrollItems.map((item, idx) => (
            <div
              key={idx}
              className="w-87.5 md:w-112.5 shrink-0 bg-card border border-border rounded-3xl p-8 hover:border-emerald-500/30 transition-colors shadow-sm whitespace-normal group/card relative"
            >
              <div className="absolute top-8 right-8 text-emerald-500/20 group-hover/card:text-emerald-500/40 transition-colors">
                <Quote className="size-12 fill-current" />
              </div>
              
              <div className="relative z-10 h-full flex flex-col">
                <p className="text-foreground/90 text-lg leading-relaxed mb-8">
                  "{item.quote}"
                </p>
                
                <div className="mt-auto">
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                  <p className="text-sm text-emerald-500/80 mt-1">{item.hospital}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Gradient fades for the edges */}
        <div className="absolute inset-y-0 left-0 w-1/6 bg-linear-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-1/6 bg-linear-to-l from-background to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto text-center px-6 mt-24 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-y border-border/50">
          <div>
            <p className="text-4xl font-semibold text-foreground mb-2">50+</p>
            <p className="text-sm text-muted-foreground uppercase font-mono tracking-wider">Hospitals</p>
          </div>
          <div>
            <p className="text-4xl font-semibold text-foreground mb-2">12k</p>
            <p className="text-sm text-muted-foreground uppercase font-mono tracking-wider">Daily Active Users</p>
          </div>
          <div>
            <p className="text-4xl font-semibold text-foreground mb-2">2M+</p>
            <p className="text-sm text-muted-foreground uppercase font-mono tracking-wider">Patient Records</p>
          </div>
          <div>
            <p className="text-4xl font-semibold text-foreground mb-2">99.9%</p>
            <p className="text-sm text-muted-foreground uppercase font-mono tracking-wider">Uptime SLA</p>
          </div>
        </div>
      </div>
    </section>
  );
}
