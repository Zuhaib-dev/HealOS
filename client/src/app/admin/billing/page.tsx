import { createPageMetadata } from "@/lib/seo/metadata";
import { BillingPanel } from "@/components/admin/panels/billing-panel";

export const metadata = createPageMetadata(
  "Billing and Revenue",
  "Billing and Revenue workspace in HealOS for hospital care and operations.",
);

export default function AdminBillingPanelPage() {
  return <BillingPanel />;
}
