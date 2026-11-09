import { createPageMetadata } from "@/lib/seo/metadata";
import { ModalitiesPanel } from "@/components/radiology/radiology-panels";

export const metadata = createPageMetadata(
  "Imaging Modalities",
  "Imaging Modalities workspace in HealOS for hospital care and operations.",
);

export default function ModalitiesPanelPage() {
  return <ModalitiesPanel />;
}
