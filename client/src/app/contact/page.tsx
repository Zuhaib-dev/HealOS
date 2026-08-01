"use client";

import { motion } from "motion/react";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { SwitchboardGlyph } from "@/components/contact/switchboard";
import { ContactForm } from "@/components/contact/contact-form";
import {
  ContactChannels,
  EscalationLadder,
  OfficesSection,
  ContactFaq,
} from "@/components/contact/contact-sections";

export default function ContactPage() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="grid grid-cols-1 items-end gap-12 pt-16 pb-14 lg:grid-cols-12 lg:pt-24">
            <div className="lg:col-span-7">
              <p className="mono-label text-brass">001 / Contact</p>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="font-display mt-6 text-[clamp(2.2rem,6vw,4.6rem)] leading-[0.95] font-bold tracking-[-0.04em]"
              >
                Tell us what the floor
                <br />
                <span className="text-brass">actually needs.</span>
              </motion.h1>
              <p className="text-muted-foreground mt-8 max-w-xl leading-relaxed">
                One inbound line, routed by clinical impact to a named human. No chat bots, no
                lead-scoring queue, no "we'll be in touch".
              </p>
              <div className="mono-label text-muted-foreground hairline-t mt-10 flex flex-wrap gap-x-10 gap-y-3 pt-6">
                <span>
                  <span className="text-foreground">37</span> live sites
                </span>
                <span>
                  <span className="text-foreground">24/7</span> clinical cover
                </span>
                <span>
                  <span className="text-foreground">15 min</span> P0 acknowledgement
                </span>
              </div>
            </div>
            <div className="lg:col-span-5">
              <SwitchboardGlyph className="w-full" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <ContactForm />
        </section>

        <ContactChannels />
        <EscalationLadder />
        <OfficesSection />
        <ContactFaq />
      </main>
      <SiteFooter />
    </div>
  );
}
