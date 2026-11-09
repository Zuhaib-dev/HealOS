import { createPageMetadata } from "@/lib/seo/metadata";
import { EmarPanel } from "@/components/nurse/panels/eMAR-panel";

export const metadata = createPageMetadata(
  "Medication Administration",
  "Medication Administration workspace in HealOS for hospital care and operations.",
);

export default function EmarPanelPage() {
  return <EmarPanel />;
}
