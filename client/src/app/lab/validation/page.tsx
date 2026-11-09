import { createPageMetadata } from "@/lib/seo/metadata";
import { ValidationPanel } from "@/components/lab/lab-panels";

export const metadata = createPageMetadata(
  "Result Validation",
  "Result Validation workspace in HealOS for hospital care and operations.",
);

export default function ValidationPanelPage() {
  return <ValidationPanel />;
}
