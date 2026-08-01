import { motion } from "motion/react";

const notes = [
  {
    quote:
      "The first week, the night registrar stopped calling me to ask where a chart was. That call used to happen four times a shift.",
    who: "Dr. Anaya Rao",
    role: "Chief of Medicine · Meridian General",
    stat: "412 beds",
  },
  {
    quote:
      "We closed our month-end in two days instead of eleven. The ledger already knew what the ward had done.",
    who: "Tomas Bergh",
    role: "Finance Director · Nordvik Health",
    stat: "6 sites",
  },
  {
    quote:
      "Structured reporting cut my dictation time in half, and the SLA board means nobody argues about turnaround anymore.",
    who: "Dr. Priya Nandakumar",
    role: "Lead Radiologist · Suvarna Institute",
    stat: "38k studies / yr",
  },
];

export function Testimonials() {
  return (
    <section id="notes" className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="hairline-t flex flex-wrap items-baseline justify-between gap-6 py-14 lg:py-20">
          <div>
            <p className="mono-label text-brass">004 / Field notes</p>
            <h2 className="font-display mt-6 text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.02] font-bold tracking-[-0.03em]">
              From people on shift.
            </h2>
          </div>
          <p className="mono-label text-muted-foreground max-w-xs">
            Verbatim, collected during quarterly reviews
          </p>
        </div>

        <div className="hairline-t grid grid-cols-1 lg:grid-cols-3">
          {notes.map((n, i) => (
            <motion.figure
              key={n.who}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="hairline-b hairline-l -ml-px flex flex-col justify-between p-7 lg:p-9"
            >
              <div>
                <span className="font-display text-accent block text-4xl leading-none">“</span>
                <blockquote className="mt-5 text-[1.0625rem] leading-relaxed">{n.quote}</blockquote>
              </div>
              <figcaption className="hairline-t mt-8 pt-5">
                <span className="font-display block text-sm font-bold tracking-tight">{n.who}</span>
                <span className="mono-label text-muted-foreground mt-2 block">{n.role}</span>
                <span className="mono-label text-brass mt-3 block">{n.stat}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
