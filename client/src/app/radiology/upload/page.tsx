import { createPageMetadata } from "@/lib/seo/metadata";
import { UploadPanel } from "@/components/radiology/radiology-panels";

export const metadata = createPageMetadata(
  "Upload Report",
  "Upload Report workspace in HealOS for hospital care and operations.",
);

export default function UploadPanelPage() {
  return <UploadPanel />;
}
