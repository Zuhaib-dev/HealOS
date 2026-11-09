import { createPageMetadata } from "@/lib/seo/metadata";
import { MedsPanel } from "@/components/patient/panels/meds-panel";

export const metadata = createPageMetadata(
  "My Medicines",
  "My Medicines workspace in HealOS for hospital care and operations.",
);

export default function MedsPanelPage() {
  return <MedsPanel />;
}
