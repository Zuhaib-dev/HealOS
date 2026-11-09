import { createPageMetadata } from "@/lib/seo/metadata";
import { BillingPanel } from "@/components/patient/panels/billing-panel";

export const metadata = createPageMetadata(
  "Patient Billing",
  "Patient Billing workspace in HealOS for hospital care and operations.",
);

export default function BillingPanelPage() {
  return <BillingPanel />;
}
