"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
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
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !user) return;

    const role = user.role.toUpperCase();
    if (role === "PATIENT" || role === "LEGACY_PATIENT") {
      router.replace("/patient");
    } else if (role === "ADMIN") {
      router.replace("/admin");
    } else if (role === "DOCTOR") {
      router.replace("/doctor");
    } else if (role === "RADIOLOGIST") {
      router.replace("/radiology");
    } else if (role === "RECEPTIONIST") {
      router.replace("/reception");
    } else if (role === "PHARMACIST") {
      router.replace("/pharmacy");
    } else if (role === "NURSE") {
      router.replace("/nurse");
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
        <Testimonials />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
