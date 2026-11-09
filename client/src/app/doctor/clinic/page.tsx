import { createPageMetadata } from "@/lib/seo/metadata";
import { ClinicPanel } from "@/components/doctor/panels/Clinic-list-panel";

export const metadata = createPageMetadata(
  "Clinic Schedule",
  "Clinic Schedule workspace in HealOS for hospital care and operations.",
);

export default function ClinicPanelPage() {
  return <ClinicPanel />;
}
