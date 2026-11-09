import { createPageMetadata } from "@/lib/seo/metadata";
import { OverviewPanel } from "@/components/admin/panels/overview-panel";

export const metadata = createPageMetadata(
  "Admin Overview",
  "Admin Overview workspace in HealOS for hospital care and operations.",
);

export default function AdminOverviewPage() {
  return <OverviewPanel />;
}
