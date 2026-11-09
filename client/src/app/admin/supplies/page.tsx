import { createPageMetadata } from "@/lib/seo/metadata";
import { SuppliesPanel } from "@/components/admin/panels/supplies-panel";

export const metadata = createPageMetadata(
  "Supplies and Inventory",
  "Supplies and Inventory workspace in HealOS for hospital care and operations.",
);

export default function AdminSuppliesPanelPage() {
  return <SuppliesPanel />;
}
