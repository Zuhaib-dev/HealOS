import { motion } from "motion/react";
import { VitalsInstrument } from "./illustrations";

const readouts = [
  { k: "Beds live", v: "1 284", d: "94% utilisation" },
  { k: "Median triage", v: "3m 41s", d: "−52% vs baseline" },
  { k: "Sites synced", v: "37", d: "0 write conflicts" },
];

const ticker = [
  "A1 · intake queue 04",
  "B2 · triage acuity 2.1",
  "B4 · MRI slot 11:20",
  "C3 · theatre 3 sterile",
  "D1 · ward 82% occupied",
  "D5 · 14 discharges today",
  "LAB · 6 results pending",
  "RX · 0 interaction flags",
];


export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="bg-graph-paper pointer-events-none absolute inset-0 opacity-60" />
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent" />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        {/* top measurement rule */}
        <div className="hairline-b flex items-center justify-between py-4">
          <span className="mono-label text-muted-foreground">Hospital operating system</span>
          <span className="mono-label text-muted-foreground hidden sm:inline">
            Est. 2019 · ISO 27001 · HIPAA
          </span>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
          {/* headline column */}
          <div className="hairline-b lg:col-span-7 lg:border-b-0 lg:pr-14 lg:pb-24">
            <div className="pt-14 pb-12 lg:pt-24">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mono-label text-brass mb-8"
              >
                001 / Introduction
              </motion.p>

              <h1 className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] font-bold tracking-[-0.03em]">
                {["Run the whole", "hospital from", "one instrument."].map((row, i) => (
                  <motion.span
                    key={row}
                    className="block overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.12 }}
                  >
                    <motion.span
                      className="block"
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      transition={{ duration: 0.85, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {i === 2 ? (
                        <>
                          one <span className="text-brass">instrument</span>.
                        </>
                      ) : (
                        row
                      )}
                    </motion.span>
                  </motion.span>
                ))}
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="text-muted-foreground mt-8 max-w-xl text-[1.0625rem] leading-relaxed"
              >
                HealOS is the record, the roster, the radiology desk and the ledger — one
                calibrated surface for clinicians who cannot afford a second guess. No
                spreadsheets. No swivel-chair. No waiting on IT.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                className="mt-10 flex flex-wrap items-center gap-3"
              >
                <a
                  href="#access"
                  className="bg-foreground text-background mono-label group inline-flex items-center gap-3 px-6 py-4 transition-opacity hover:opacity-85"
                >
                  Request access
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </a>
                <a
                  href="#modules"
                  className="mono-label hairline-t hairline-b text-muted-foreground hover:text-foreground inline-flex items-center px-6 py-4 transition-colors"
                >
                  Read the spec
                </a>
              </motion.div>
            </div>
          </div>

          {/* instrument column */}
          <div className="lg:hairline-l lg:col-span-5 lg:pl-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="pt-12 lg:pt-24"
            >
              <div className="plate p-5">
                <div className="mono-label text-muted-foreground mb-4 flex items-center justify-between">
                  <span>Ward telemetry</span>
                  <span className="text-brass animate-blink flex items-center gap-2">
                    <span className="bg-accent inline-block h-1.5 w-1.5" /> live
                  </span>
                </div>
                <VitalsInstrument className="h-40 w-full" />
              </div>

              <div className="mt-0">
                {readouts.map((r, i) => (
                  <motion.div
                    key={r.k}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.12 }}
                    className="hairline-b flex items-baseline justify-between gap-4 py-5"
                  >
                    <span className="mono-label text-muted-foreground">{r.k}</span>
                    <span className="text-right">
                      <span className="font-display block text-2xl font-bold tracking-tight">{r.v}</span>
                      <span className="mono-label text-brass">{r.d}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* live floor ticker */}
        <div className="hairline-t hairline-b relative overflow-hidden py-3">
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l to-transparent" />
          <motion.div
            className="flex w-max gap-10"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {[...ticker, ...ticker].map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="mono-label text-muted-foreground flex shrink-0 items-center gap-3"
              >
                <span className="bg-brass inline-block h-1 w-1" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* scroll cue */}
        <div className="flex items-center justify-center py-6">
          <motion.a
            href="#modules"
            className="mono-label text-muted-foreground hover:text-foreground flex flex-col items-center gap-2 transition-colors"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span>Scroll</span>
            <span className="bg-accent/60 block h-8 w-px" />
          </motion.a>
        </div>
      </div>
    </section>

  );
}
