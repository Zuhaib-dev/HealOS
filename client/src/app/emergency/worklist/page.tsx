import { createPageMetadata } from "@/lib/seo/metadata";
import { EmergencyWorklistPanel } from "@/components/emergency/panels/worklist-panel";

export const metadata = createPageMetadata(
  "My ED Cases",
  "My ED Cases workspace in HealOS for hospital care and operations.",
);

export default function EmergencyWorklistPage() {
  return <EmergencyWorklistPanel />;
}
