"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { getRoleDashboardPath } from "@/lib/auth-navigation";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { PatientJourney } from "@/components/landing/patient-journey";
import { InstrumentBento } from "@/components/landing/instrument-bento";
import { WhyHealOS } from "@/components/landing/why-healos";
import { Testimonials } from "@/components/landing/testimonials";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !user) return;

    const destination = getRoleDashboardPath(user.role);
    if (destination && destination !== "/") {
      router.replace(destination);
    }
  }, [_hasHydrated, isAuthenticated, user, router]);


  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <WhyHealOS />
        <PatientJourney />
        <InstrumentBento />
        <Testimonials />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
