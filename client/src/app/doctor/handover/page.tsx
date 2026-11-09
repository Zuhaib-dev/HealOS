import { createPageMetadata } from "@/lib/seo/metadata";
import { HandoverPanel } from "@/components/doctor/panels/Handover-panel";

export const metadata = createPageMetadata(
  "Care Handover",
  "Care Handover workspace in HealOS for hospital care and operations.",
);

export default function HandoverPanelPage() {
  return <HandoverPanel />;
}
