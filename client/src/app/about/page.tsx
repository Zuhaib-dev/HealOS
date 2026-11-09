import { createPageMetadata } from "@/lib/seo/metadata";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { EditorialMission } from "@/components/landing/editorial-mission";

export const metadata = createPageMetadata(
  "About HealOS",
  "Learn about HealOS, a hospital operations platform connecting patient access with clinical and administrative workflows.",
  { canonical: "/about" },
);

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
