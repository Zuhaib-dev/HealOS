import { createPageMetadata } from "@/lib/seo/metadata";
import { RxQueuePanel } from "@/components/pharmacy/pharmacy-panels";

export const metadata = createPageMetadata(
  "Pharmacy Prescription Queue",
  "Pharmacy Prescription Queue workspace in HealOS for hospital care and operations.",
);

export default function RxQueuePanelPage() {
  return <RxQueuePanel />;
}
