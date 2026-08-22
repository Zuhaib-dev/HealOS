import { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { WorkbenchFeatures } from "@/components/landing/workbench-features";

export const metadata: Metadata = {
  title: "Platform Features | HealOS",
  description: "Explore the comprehensive modules of the HealOS hospital management system, from Radiology to Pharmacy.",
  alternates: {
    canonical: "/features",
  },
};

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
