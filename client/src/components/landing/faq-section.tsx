"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const faqs = [
  {
    q: "Can HealOS run alongside our existing HIS?",
    a: "Yes. HealOS speaks FHIR R4 and HL7 v2, so it can operate as the clinical surface over a legacy system while modules are migrated one at a time. Most sites start with the record and the roster.",
  },
  {
    q: "Where does patient data physically live?",
    a: "In the region you nominate, with encryption at rest and in transit, field-level access control and break-glass logging. On-premise deployment is available for jurisdictions that require it.",
  },
  {
    q: "How long does implementation actually take?",
    a: "Median go-live for a single site is eleven days, including data migration dry runs and two clinician training cohorts. Multi-site networks are staged per site rather than all at once.",
  },
  {
    q: "What happens to reporting templates we already use?",
    a: "They are imported as structured templates, preserving your macros and section order. Radiologists keep the phrasing they trust while the output becomes machine-readable.",
  },
  {
    q: "Is there an audit trail suitable for external review?",
    a: "Every read and write is attributable and immutable. You can export a complete evidence pack for a date range and scope, formatted for accreditation review.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="questions" className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="hairline-t grid grid-cols-1 lg:grid-cols-12">
          <div className="py-14 lg:col-span-4 lg:py-20 lg:pr-10">
            <p className="mono-label text-brass">005 / Questions</p>
            <h2 className="font-display mt-6 text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.02] font-bold tracking-[-0.03em]">
              Asked before
              <br />
              every signature.
            </h2>
            <p className="text-muted-foreground mt-6 max-w-sm text-sm leading-relaxed">
              Anything not answered here, our clinical implementation lead will answer on a call —
              not a sales engineer.
            </p>
          </div>

          <div className="lg:hairline-l lg:col-span-8 lg:py-20 lg:pl-14">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="hairline-t last:hairline-b">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-baseline gap-5 py-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="mono-label text-brass shrink-0 pt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display flex-1 text-base font-bold tracking-tight sm:text-lg">
                      {f.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-muted-foreground group-hover:text-foreground shrink-0 text-xl leading-none"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-muted-foreground max-w-2xl pb-7 pl-11 text-sm leading-relaxed">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
