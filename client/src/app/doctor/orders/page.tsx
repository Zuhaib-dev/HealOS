import { createPageMetadata } from "@/lib/seo/metadata";
import { OrdersPanel } from "@/components/doctor/panels/Orders-&-meds-panel";

export const metadata = createPageMetadata(
  "Orders and Prescriptions",
  "Orders and Prescriptions workspace in HealOS for hospital care and operations.",
);

export default function OrdersPanelPage() {
  return <OrdersPanel />;
}
