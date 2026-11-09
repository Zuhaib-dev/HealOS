import { createPageMetadata } from "@/lib/seo/metadata";
import { ReportingPanel } from "@/components/radiology/radiology-panels";

export const metadata = createPageMetadata(
  "Radiology Reporting",
  "Radiology Reporting workspace in HealOS for hospital care and operations.",
);

export default function ReportingPanelPage() {
  return <ReportingPanel />;
}
