import { createPageMetadata } from "@/lib/seo/metadata";
import { EmergencyRecordsPanel } from "@/components/emergency/panels/records-panel";

export const metadata = createPageMetadata(
  "ED Records",
  "ED Records workspace in HealOS for hospital care and operations.",
);

export default function EmergencyRecordsPage() {
  return <EmergencyRecordsPanel />;
}
