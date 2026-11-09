import { createPageMetadata } from "@/lib/seo/metadata";
import { WardsPanel } from "@/components/admin/panels/wards-panel";

export const metadata = createPageMetadata(
  "Ward Management",
  "Ward Management workspace in HealOS for hospital care and operations.",
);

export default function AdminWardsPanelPage() {
  return <WardsPanel />;
}
