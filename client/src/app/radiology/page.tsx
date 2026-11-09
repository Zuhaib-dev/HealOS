import { createPageMetadata } from "@/lib/seo/metadata";
import { WorklistPanel } from "@/components/radiology/radiology-panels";

export const metadata = createPageMetadata(
  "Radiology Worklist",
  "Radiology Worklist workspace in HealOS for hospital care and operations.",
);

export default function WorklistPanelPage() {
  return <WorklistPanel />;
}
