"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

export function CtaSection() {
  const [query, setQuery] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsPending(true);
    try {
      const res = await fetch(`/api/v1/sandbox?query=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        toast.success("Sandbox toolcall executed successfully.");
      } else {
        toast.error("Evaluation request failed.");
      }
    } catch {
      toast.error("Network error during evaluation.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section id="access" className="relative overflow-hidden">
      <div className="mx-auto max-w-350 px-5 sm:px-8">
        <div className="hairline-t relative">
          {/* brass sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="via-accent/25 animate-sweep absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent to-transparent" />
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

              {/* WebMCP In-Page Agent Affordance Form */}
              <form
                action="/api/v1/sandbox"
                method="GET"
                data-tool="search_clinical_records"
                tool-name="search_clinical_records"
                tool-description="Search patient directory, clinical records, and bed occupancy in HealOS"
                onSubmit={handleSearch}
                className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md"
              >
                <div className="flex-1">
                  <label htmlFor="webmcp-search-input" className="sr-only">
                    Search clinical records or sandbox probe
                  </label>
                  <input
                    id="webmcp-search-input"
                    name="query"
                    data-tool-param="query"
                    type="text"
                    required
                    minLength={2}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search records or sandbox probe…"
                    className="w-full rounded-md border border-border bg-card px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-md bg-foreground px-5 py-3 font-mono text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Evaluating..." : "Run WebMCP Tool"}
                </button>
              </form>
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
                  href="/developers"
                  className="mono-label hairline-t hairline-b text-muted-foreground hover:text-foreground inline-flex items-center px-7 py-4 transition-colors"
                >
                  Developer portal
                </a>
              </div>
              <div className="mono-label text-muted-foreground mt-8 space-y-3">
                <p className="rule-tick pl-4">No credit card, no procurement gate</p>
                <p className="rule-tick pl-4">Sandbox with synthetic patient data</p>
                <p className="rule-tick pl-4">WebMCP browser tool calling supported</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
