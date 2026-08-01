import { motion } from "motion/react";
import { SiteMapGlyph } from "./switchboard";

const channels = [
  {
    id: "01",
    title: "Clinical support",
    line: "+1 (415) 555 0142",
    mail: "support@healos.health",
    detail: "Live 24/7/365. Bedside-blocking issues get a clinician-trained engineer, not a script.",
    sla: "15 min",
  },
  {
    id: "02",
    title: "New deployments",
    line: "+1 (415) 555 0188",
    mail: "deployments@healos.health",
    detail: "Migration scoping, HL7/FHIR mapping, data extraction from your incumbent system.",
    sla: "1 day",
  },
  {
    id: "03",
    title: "Security & compliance",
    line: "PGP key on request",
    mail: "security@healos.health",
    detail: "HIPAA, DPDP and GDPR documentation, pen-test reports, vulnerability disclosure.",
    sla: "4 hrs",
  },
  {
    id: "04",
    title: "Press & partnerships",
    line: "Media kit available",
    mail: "press@healos.health",
    detail: "Interviews, clinical outcome data, integration and reseller partnerships.",
    sla: "3 days",
  },
];

export function ContactChannels() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <div className="hairline-t py-16">
        <p className="mono-label text-brass">002 / Direct lines</p>
        <h2 className="font-display mt-6 max-w-2xl text-[clamp(1.7rem,3.4vw,2.75rem)] leading-[1.02] font-bold tracking-[-0.035em]">
          Every desk has a name and a clock on it.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="hairline-t group relative pt-6 pr-6 sm:hairline-l sm:pl-6"
            >
              <div className="flex items-baseline justify-between">
                <span className="mono-label text-muted-foreground">{c.id}</span>
                <span className="mono-label text-brass">≤ {c.sla}</span>
              </div>
              <h3 className="font-display mt-6 text-xl font-bold tracking-[-0.02em]">{c.title}</h3>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{c.detail}</p>
              <a
                href={`mailto:${c.mail}`}
                className="text-foreground hover:text-brass mt-6 block text-sm transition-colors"
              >
                {c.mail}
              </a>
              <p className="mono-label text-muted-foreground mt-2 pb-8">{c.line}</p>
              <motion.div
                className="bg-accent absolute bottom-0 left-0 h-px"
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.07 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const escalation = [
  { tier: "P0", label: "Care delivery stopped", ack: "15 min", update: "30 min", route: "On-call clinical engineer + duty CTO" },
  { tier: "P1", label: "Module degraded, workaround exists", ack: "1 hr", update: "4 hrs", route: "Named deployment engineer" },
  { tier: "P2", label: "Defect, no clinical impact", ack: "1 day", update: "Weekly", route: "Product queue with ticket ID" },
  { tier: "P3", label: "Request or question", ack: "2 days", update: "On change", route: "Success manager" },
];

export function EscalationLadder() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <div className="hairline-t grid grid-cols-1 gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="mono-label text-brass">003 / Escalation</p>
          <h2 className="font-display mt-6 text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.02] font-bold tracking-[-0.035em]">
            What happens after you press send.
          </h2>
          <p className="text-muted-foreground mt-6 text-sm leading-relaxed">
            Severity is set by clinical impact, not by contract tier. Every ticket carries an
            audit trail you can export.
          </p>
        </div>

        <div className="lg:col-span-8">
          <div className="mono-label text-muted-foreground hairline-b grid grid-cols-12 gap-4 pb-4">
            <span className="col-span-2">Tier</span>
            <span className="col-span-4">Condition</span>
            <span className="col-span-2">Ack</span>
            <span className="col-span-4">Routed to</span>
          </div>
          {escalation.map((row, i) => (
            <motion.div
              key={row.tier}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="hairline-b grid grid-cols-12 items-center gap-4 py-5"
            >
              <span className="col-span-2 flex items-center gap-2">
                <motion.span
                  className="bg-accent h-1.5 w-1.5 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
                />
                <span className="font-display font-bold">{row.tier}</span>
              </span>
              <span className="col-span-4 text-sm">{row.label}</span>
              <span className="mono-label text-brass col-span-2">{row.ack}</span>
              <span className="text-muted-foreground col-span-4 text-sm">{row.route}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const offices = [
  { city: "San Francisco", role: "HQ / Product", addr: "410 Townsend St, Suite 3", tz: "UTC−7", hours: "08:00 – 18:00" },
  { city: "London", role: "EMEA clinical", addr: "22 Bishopsgate, Level 14", tz: "UTC+1", hours: "08:00 – 18:00" },
  { city: "Bengaluru", role: "Engineering / 24h desk", addr: "Prestige Tech Park, Block C", tz: "UTC+5:30", hours: "Always on" },
  { city: "Singapore", role: "APAC deployments", addr: "1 Raffles Place, #33-02", tz: "UTC+8", hours: "09:00 – 19:00" },
];

export function OfficesSection() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <div className="hairline-t grid grid-cols-1 gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="mono-label text-brass">004 / Sites</p>
          <h2 className="font-display mt-6 text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.02] font-bold tracking-[-0.035em]">
            Four desks, one follow-the-sun rota.
          </h2>
          <SiteMapGlyph className="mt-10 w-full" />
        </div>

        <div className="lg:col-span-7 lg:hairline-l lg:pl-10">
          {offices.map((o, i) => (
            <motion.div
              key={o.city}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="hairline-b flex flex-wrap items-baseline justify-between gap-4 py-6 first:pt-0"
            >
              <div>
                <h3 className="font-display text-lg font-bold tracking-[-0.02em]">{o.city}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{o.addr}</p>
              </div>
              <div className="text-right">
                <p className="mono-label text-brass">{o.role}</p>
                <p className="mono-label text-muted-foreground mt-2">
                  {o.tz} · {o.hours}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Can we talk to a clinician, not a salesperson?",
    a: "Yes. Pick 'Product walkthrough' and we bring a practising clinician onto the call by default.",
  },
  {
    q: "Do you sign a BAA / DPA before a demo?",
    a: "We can. Choose 'Security / compliance review' and we send the BAA, DPA, SOC 2 report and latest pen-test summary before anything technical.",
  },
  {
    q: "We already have an EHR. Will you replace it?",
    a: "Only if you want that. HealOS runs alongside incumbents over HL7 v2 and FHIR R4, and most sites start with one department.",
  },
  {
    q: "Is this a live incident?",
    a: "Do not use this form. Call the 24/7 clinical line — it pages an on-call engineer immediately.",
  },
];

export function ContactFaq() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <div className="hairline-t grid grid-cols-1 gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="mono-label text-brass">005 / Before you write</p>
        </div>
        <div className="lg:col-span-8">
          {faqs.map((f, i) => (
            <motion.div
              key={f.q}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="hairline-b py-6 first:pt-0"
            >
              <h3 className="font-display text-lg font-bold tracking-[-0.02em]">{f.q}</h3>
              <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">{f.a}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
