import { createPageMetadata } from "@/lib/seo/metadata";
import { PastOrdersPanel } from "@/components/pharmacy/pharmacy-panels";

export const metadata = createPageMetadata(
  "Dispensing History",
  "Dispensing History workspace in HealOS for hospital care and operations.",
);

export default function HistoryPage() {
  return <PastOrdersPanel />;
}
