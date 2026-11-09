import { createPageMetadata } from "@/lib/seo/metadata";
import { ResusPanel } from "@/components/emergency/emergency-panels";

export const metadata = createPageMetadata(
  "Resuscitation Bays",
  "Resuscitation Bays workspace in HealOS for hospital care and operations.",
);

export default function ResusPanelPage() {
  return <ResusPanel />;
}
