import { createPageMetadata } from "@/lib/seo/metadata";
import { WoundCarePanel } from "@/components/nurse/panels/wound-care-panel";

export const metadata = createPageMetadata(
  "Wound Care",
  "Wound Care workspace in HealOS for hospital care and operations.",
);

export default function WoundPanelPage() {
  return <WoundCarePanel />;
}
