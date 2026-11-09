import { createPageMetadata } from "@/lib/seo/metadata";
import { ArchivePanel } from "@/components/radiology/radiology-panels";

export const metadata = createPageMetadata(
  "Imaging Archive",
  "Imaging Archive workspace in HealOS for hospital care and operations.",
);

export default function ArchivePanelPage() {
  return <ArchivePanel />;
}
