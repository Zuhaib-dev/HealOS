import { createPageMetadata } from "@/lib/seo/metadata";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { TestimonialMarquee } from "@/components/landing/testimonial-marquee";

export const metadata = createPageMetadata(
  "HealOS Testimonials",
  "Read feedback and stories about the HealOS hospital operations platform.",
  { canonical: "/testimonials" },
);

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
