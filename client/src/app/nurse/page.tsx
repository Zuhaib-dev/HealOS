import { createPageMetadata } from "@/lib/seo/metadata";
import { VitalsRoundsPanel } from "@/components/nurse/panels/vitals-rounds-panel";

export const metadata = createPageMetadata(
  "Nursing Dashboard",
  "Nursing Dashboard workspace in HealOS for hospital care and operations.",
);

export default function VitalsRoundsPanelPage() {
  return <VitalsRoundsPanel />;
}
