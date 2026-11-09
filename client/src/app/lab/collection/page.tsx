import { createPageMetadata } from "@/lib/seo/metadata";
import { CollectionPanel } from "@/components/lab/lab-panels";

export const metadata = createPageMetadata(
  "Sample Collection",
  "Sample Collection workspace in HealOS for hospital care and operations.",
);

export default function CollectionPanelPage() {
  return <CollectionPanel />;
}
