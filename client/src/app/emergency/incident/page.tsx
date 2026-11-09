import { createPageMetadata } from "@/lib/seo/metadata";
import { MajorIncidentPanel } from "@/components/emergency/emergency-panels";

export const metadata = createPageMetadata(
  "Major Incident Plan",
  "Major Incident Plan workspace in HealOS for hospital care and operations.",
);

export default function MajorIncidentPanelPage() {
  return <MajorIncidentPanel />;
}
