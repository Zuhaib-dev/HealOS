import { createPageMetadata } from "@/lib/seo/metadata";
import { AnalyticsPanel } from "@/components/lab/lab-panels";

export const metadata = createPageMetadata(
  "Lab Analytics",
  "Lab Analytics workspace in HealOS for hospital care and operations.",
);

export default function LabAnalyticsPage() {
  return <AnalyticsPanel />;
}
