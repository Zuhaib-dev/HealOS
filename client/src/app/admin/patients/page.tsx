import { createPageMetadata } from "@/lib/seo/metadata";
import { PatientsPanel } from "@/components/admin/panels/patients-panel";

export const metadata = createPageMetadata(
  "Patient Directory",
  "Patient Directory workspace in HealOS for hospital care and operations.",
);

export default function AdminPatientsPanelPage() {
  return <PatientsPanel />;
}
