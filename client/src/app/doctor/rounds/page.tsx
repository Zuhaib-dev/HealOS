import { createPageMetadata } from "@/lib/seo/metadata";
import { RoundsPanel } from "@/components/doctor/panels/My-patients-panel";

export const metadata = createPageMetadata(
  "Patient Rounds",
  "Patient Rounds workspace in HealOS for hospital care and operations.",
);

export default function RoundsPanelPage() {
  return <RoundsPanel />;
}
