import { motion } from "motion/react";
import { LoadLadder } from "./illustrations";

const proof = [
  { k: "Deployment", v: "11 days", d: "median go-live, single site" },
  { k: "Uptime", v: "99.98%", d: "trailing 12 months" },
  { k: "Audit findings", v: "0", d: "across 14 external reviews" },
];

export function WhyHealOS() {
  return (
    <section id="evidence" className="relative">
      <div className="bg-scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-350 px-5 sm:px-8">
        <div className="hairline-t grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 lg:py-24 lg:pr-14">
            <div className="py-14 lg:py-0">
              <p className="mono-label text-brass">003 / Evidence</p>
              <h2 className="font-display mt-6 text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.02] font-bold tracking-[-0.03em]">
                Measured against
                <br />
                the old way.
              </h2>
              <p className="text-muted-foreground mt-6 max-w-md leading-relaxed">
                Grey bar is the workflow HealOS replaced. Brass bar is the same workflow after
                twelve weeks. Figures are medians across 37 deployed sites, self-reported and
                independently sampled.
              </p>

              <div className="mt-10">
                {proof.map((p, i) => (
                  <motion.div
                    key={p.k}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="hairline-t flex items-baseline justify-between gap-6 py-5"
                  >
                    <span className="mono-label text-muted-foreground">{p.k}</span>
                    <span className="text-right">
                      <span className="font-display block text-3xl font-bold tracking-tight">
                        {p.v}
                      </span>
                      <span className="mono-label text-muted-foreground">{p.d}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:hairline-l lg:col-span-7 lg:py-24 lg:pl-14">
            <div className="plate p-6 lg:p-10">
              <div className="mono-label text-muted-foreground hairline-b flex items-center justify-between pb-4">
                <span>Workflow load index</span>
                <span className="flex items-center gap-4">
                  <span className="flex items-center gap-2">
                    <span className="bg-foreground/25 inline-block h-0.75 w-4" /> before
                  </span>
                  <span className="text-brass flex items-center gap-2">
                    <span className="bg-accent inline-block h-0.75 w-4" /> HealOS
                  </span>
                </span>
              </div>
              <LoadLadder className="mt-2" />
              <p className="mono-label text-muted-foreground mt-6">
                Sample n=37 · window 12 weeks · lower is better
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
