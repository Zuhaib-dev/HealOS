import { motion } from "motion/react";
import {
  RecordsGlyph,
  OrbitGlyph,
  ScanGlyph,
  LedgerGlyph,
  ShieldGlyph,
  NetworkGlyph,
} from "./illustrations";

const modules = [
  {
    id: "01",
    name: "Longitudinal record",
    body: "Every encounter, med, allergy and note on one timeline. Versioned, attributable, searchable in under 80ms.",
    Glyph: RecordsGlyph,
    meta: "EMR / FHIR R4",
  },
  {
    id: "02",
    name: "Roster & theatre plan",
    body: "Shift patterns, leave, OT slots and on-call escalation resolved by constraint solver — not by phone calls.",
    Glyph: OrbitGlyph,
    meta: "Scheduling",
  },
  {
    id: "03",
    name: "Radiology desk",
    body: "DICOM viewer, structured reporting templates and turnaround SLAs measured per radiologist, per modality.",
    Glyph: ScanGlyph,
    meta: "PACS / RIS",
  },
  {
    id: "04",
    name: "Revenue ledger",
    body: "Charge capture at the point of care, payer rules pre-flighted, denials worked from a single queue.",
    Glyph: LedgerGlyph,
    meta: "Billing",
  },
  {
    id: "05",
    name: "Consent & audit",
    body: "Field-level access, break-glass logging, retention policy per jurisdiction. Exportable evidence pack.",
    Glyph: ShieldGlyph,
    meta: "Governance",
  },
  {
    id: "06",
    name: "Multi-site fabric",
    body: "Referrals, bed transfers and lab orders move between sites without leaving the record behind.",
    Glyph: NetworkGlyph,
    meta: "Network",
  },
];

export function Features() {
  return (
    <section id="modules" className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="hairline-t grid grid-cols-1 gap-8 py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-4">
            <p className="mono-label text-brass">002 / Modules</p>
            <h2 className="font-display mt-6 text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.02] font-bold tracking-[-0.03em]">
              Six instruments,
              <br />
              one calibration.
            </h2>
          </div>
          <p className="text-muted-foreground lg:col-span-5 lg:col-start-8 lg:self-end">
            Modules share one data model, so a bed transfer, a claim and a radiology order all
            reference the same patient object. Nothing is reconciled after the fact.
          </p>
        </div>

        <div className="hairline-t grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((m, i) => (
            <motion.article
              key={m.id}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}
              className="hairline-b hairline-l group relative -ml-px p-7 lg:p-9"
            >
              <div className="mono-label text-muted-foreground flex items-center justify-between">
                <span className="text-brass">{m.id}</span>
                <span>{m.meta}</span>
              </div>

              <div className="text-foreground mt-8 h-24">
                <m.Glyph className="h-full w-auto transition-transform duration-700 group-hover:scale-[1.04]" />
              </div>

              <h3 className="font-display mt-8 text-xl font-bold tracking-tight">{m.name}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{m.body}</p>

              <span className="bg-accent absolute bottom-0 left-0 h-px w-0 transition-all duration-500 group-hover:w-full" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
