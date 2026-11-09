import { createPageMetadata } from "@/lib/seo/metadata";
import { HandoverPanel } from "@/components/nurse/panels/handover-panel";

export const metadata = createPageMetadata(
  "Nursing Handover",
  "Nursing Handover workspace in HealOS for hospital care and operations.",
);

export default function HandoverPanelPage() {
  return <HandoverPanel />;
}
