import { createPageMetadata } from "@/lib/seo/metadata";
import { EmergencyPendingPanel } from "@/components/emergency/panels/pending-panel";

export const metadata = createPageMetadata(
  "ED Pending Work",
  "ED Pending Work workspace in HealOS for hospital care and operations.",
);

export default function EmergencyPendingPage() {
  return <EmergencyPendingPanel />;
}
