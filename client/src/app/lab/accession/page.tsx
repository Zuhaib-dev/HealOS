import { createPageMetadata } from "@/lib/seo/metadata";
import { AccessioningPanel } from "@/components/lab/lab-panels";

export const metadata = createPageMetadata(
  "Lab Accessioning",
  "Lab Accessioning workspace in HealOS for hospital care and operations.",
);

export default function AccessioningPanelPage() {
  return <AccessioningPanel />;
}
