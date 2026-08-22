import { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { EditorialMission } from "@/components/landing/editorial-mission";

export const metadata: Metadata = {
  title: "About Us | HealOS",
  description: "Read about the clinical mission driving the development of HealOS.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-24 pb-16">
        <EditorialMission />
      </main>
      <SiteFooter />
    </div>
  );
}
