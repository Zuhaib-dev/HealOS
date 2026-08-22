import { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { TestimonialMarquee } from "@/components/landing/testimonial-marquee";

export const metadata: Metadata = {
  title: "Testimonials | HealOS",
  description: "See why top healthcare professionals trust HealOS with their clinical infrastructure.",
  alternates: {
    canonical: "/testimonials",
  },
};

export default function TestimonialsPage() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-24 pb-16">
        <TestimonialMarquee />
      </main>
      <SiteFooter />
    </div>
  );
}
