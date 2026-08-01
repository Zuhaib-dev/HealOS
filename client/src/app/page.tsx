"use client";

import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { PatientJourney } from "@/components/landing/patient-journey";
import { WhyHealOS } from "@/components/landing/why-healos";
import { Testimonials } from "@/components/landing/testimonials";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <WhyHealOS />
        <PatientJourney />
        <Testimonials />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
