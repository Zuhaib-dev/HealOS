import { createPageMetadata } from "@/lib/seo/metadata";
import { CollectionPanel } from "@/components/lab/lab-panels";

export const metadata = createPageMetadata(
  "Laboratory Collection",
  "Laboratory Collection workspace in HealOS for hospital care and operations.",
);

export default function CollectionPanelPage() {
  return <CollectionPanel />;
}
