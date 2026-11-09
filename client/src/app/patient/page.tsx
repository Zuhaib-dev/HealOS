import { createPageMetadata } from "@/lib/seo/metadata";
import { OverviewPanel } from "@/components/patient/panels/overview-panel";

export const metadata = createPageMetadata(
  "Patient Dashboard",
  "Patient Dashboard workspace in HealOS for hospital care and operations.",
);

export default function OverviewPanelPage() {
  return <OverviewPanel />;
}
