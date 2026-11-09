import { createPageMetadata } from "@/lib/seo/metadata";
import { ReportsPanel } from "@/components/patient/panels/reports-panel";

export const metadata = createPageMetadata(
  "Medical Reports",
  "Medical Reports workspace in HealOS for hospital care and operations.",
);

export default function ReportsPanelPage() {
  return <ReportsPanel />;
}
