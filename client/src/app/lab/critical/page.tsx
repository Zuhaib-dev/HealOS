import { createPageMetadata } from "@/lib/seo/metadata";
import { CriticalPanel } from "@/components/lab/lab-panels";

export const metadata = createPageMetadata(
  "Critical Results",
  "Critical Results workspace in HealOS for hospital care and operations.",
);

export default function CriticalPanelPage() {
  return <CriticalPanel />;
}
