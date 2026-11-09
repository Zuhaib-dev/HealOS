import { createPageMetadata } from "@/lib/seo/metadata";
import { RotaPanel } from "@/components/doctor/panels/Rota-panel";

export const metadata = createPageMetadata(
  "Clinician Rota",
  "Clinician Rota workspace in HealOS for hospital care and operations.",
);

export default function RotaPanelPage() {
  return <RotaPanel />;
}
