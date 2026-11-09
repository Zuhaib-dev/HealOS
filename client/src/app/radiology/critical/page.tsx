import { createPageMetadata } from "@/lib/seo/metadata";
import { CriticalPanel } from "@/components/radiology/radiology-panels";

export const metadata = createPageMetadata(
  "Critical Findings",
  "Critical Findings workspace in HealOS for hospital care and operations.",
);

export default function CriticalPanelPage() {
  return <CriticalPanel />;
}
