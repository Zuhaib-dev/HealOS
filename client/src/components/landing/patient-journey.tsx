import { motion } from "motion/react";
import { JourneyFloorplan } from "./journey-floorplan";

const stages = [
  {
    code: "01",
    name: "Intake",
    t: "00:00",
    body: "ID, insurance and consent captured once. The record opens before the patient sits down.",
  },
  {
    code: "02",
    name: "Triage",
    t: "00:03",
    body: "Acuity scored against live ward capacity — the queue re-orders itself, not the nurse.",
  },
  {
    code: "03",
    name: "Imaging",
    t: "00:26",
    body: "Order, modality slot and radiologist read chained on one thread. No phone calls.",
  },
  {
    code: "04",
    name: "Theatre",
    t: "02:10",
    body: "Kit, team and anaesthesia checklist locked to the slot. Conflicts refuse to book.",
  },
  {
    code: "05",
    name: "Ward",
    t: "05:45",
    body: "Vitals, meds and notes on one continuous chart, handed over shift to shift.",
  },
  {
    code: "06",
    name: "Discharge",
    t: "31:20",
    body: "Summary, script and claim file generated together — coded and clean on first pass.",
  },
];

export function PatientJourney() {
  return (
    <section id="journey" className="relative overflow-hidden">
      <div className="bg-scanlines pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="hairline-b flex items-baseline justify-between py-4">
          <span className="mono-label text-brass">004 / Patient journey</span>
          <span className="mono-label text-muted-foreground hidden sm:inline">
            One admission · 31h 20m · zero re-entry
          </span>
        </div>

        <div className="grid grid-cols-1 gap-0 pt-14 lg:grid-cols-12 lg:pt-20">
          <div className="lg:col-span-5 lg:pr-14">
            <h2 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.02] font-bold tracking-[-0.03em]">
              Every corridor, <span className="text-brass">one thread.</span>
            </h2>
            <p className="text-muted-foreground mt-6 max-w-md leading-relaxed">
              HealOS follows the patient, not the department. The same record moves from the
              front desk to theatre to the claim file — timestamped, attributable, and never
              typed twice.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-0">
              {[
                { k: "Handover loss", v: "0" },
                { k: "Re-entered fields", v: "0" },
                { k: "Audit trail", v: "100%" },
                { k: "First-pass claims", v: "97.4%" },
              ].map((s) => (
                <div key={s.k} className="hairline-t hairline-b py-4">
                  <div className="font-display text-2xl font-bold tracking-tight">{s.v}</div>
                  <div className="mono-label text-muted-foreground">{s.k}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:hairline-l mt-12 lg:col-span-7 lg:mt-0 lg:pl-14">
            <div className="plate p-4 sm:p-6">
              <div className="mono-label text-muted-foreground mb-4 flex items-center justify-between">
                <span>Floor schematic · level 2</span>
                <span className="text-brass animate-blink flex items-center gap-2">
                  <span className="bg-accent inline-block h-1.5 w-1.5" /> tracking
                </span>
              </div>
              <JourneyFloorplan className="h-auto w-full" />
            </div>
          </div>
        </div>

        {/* stage ledger */}
        <div className="mt-16 grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((s, i) => (
            <motion.div
              key={s.code}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
              className="hairline-t hairline-l group relative px-6 py-8 last:hairline-b sm:last:border-b-0"
            >
              <motion.span
                className="bg-accent absolute top-0 left-0 h-[2px] w-full origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, delay: 0.15 + (i % 3) * 0.1, ease: "easeOut" }}
              />
              <div className="mono-label text-muted-foreground flex items-baseline justify-between">
                <span className="text-brass">{s.code}</span>
                <span>T+{s.t}</span>
              </div>
              <h3 className="font-display mt-4 text-lg font-bold tracking-tight">{s.name}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
