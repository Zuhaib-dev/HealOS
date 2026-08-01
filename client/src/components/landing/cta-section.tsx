import { motion } from "motion/react";

export function CtaSection() {
  return (
    <section id="access" className="relative overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="hairline-t relative">
          {/* brass sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="via-accent/25 animate-sweep absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent to-transparent" />
          </div>

          <div className="relative grid grid-cols-1 items-end gap-10 py-20 lg:grid-cols-12 lg:py-28">
            <div className="lg:col-span-7">
              <p className="mono-label text-brass">006 / Access</p>
              <motion.h2
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="font-display mt-6 text-[clamp(2rem,5vw,4rem)] leading-[0.98] font-bold tracking-[-0.035em]"
              >
                Put the whole hospital
                <br />
                <span className="text-brass">on one instrument.</span>
              </motion.h2>
              <p className="text-muted-foreground mt-7 max-w-lg leading-relaxed">
                Bring a clinician, an administrator and your data lead. We will walk your real
                workflow through HealOS in 45 minutes — no slideware.
              </p>
            </div>

            <div className="lg:col-span-5 lg:justify-self-end">
              <div className="flex flex-wrap gap-3">
                <a
                  href="#top"
                  className="bg-foreground text-background mono-label group inline-flex items-center gap-3 px-7 py-4 transition-opacity hover:opacity-85"
                >
                  Book the walkthrough
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </a>
                <a
                  href="#modules"
                  className="mono-label hairline-t hairline-b text-muted-foreground hover:text-foreground inline-flex items-center px-7 py-4 transition-colors"
                >
                  Download spec
                </a>
              </div>
              <div className="mono-label text-muted-foreground mt-8 space-y-3">
                <p className="rule-tick pl-4">No credit card, no procurement gate</p>
                <p className="rule-tick pl-4">Sandbox with synthetic patient data</p>
                <p className="rule-tick pl-4">Migration dry run included</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
