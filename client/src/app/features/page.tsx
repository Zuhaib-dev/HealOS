import { createPageMetadata } from "@/lib/seo/metadata";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { WorkbenchFeatures } from "@/components/landing/workbench-features";

export const metadata = createPageMetadata(
  "Hospital Management Platform Features",
  "Explore patient, clinical, diagnostic, pharmacy, billing, and emergency department workflows in HealOS.",
  { canonical: "/features" },
);

export default function FeaturesPage() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-24 pb-16">
        <WorkbenchFeatures />
      </main>
      <SiteFooter />
    </div>
  );
}
