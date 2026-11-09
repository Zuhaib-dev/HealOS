import { createPageMetadata } from "@/lib/seo/metadata";
import { ResultsPanel } from "@/components/doctor/panels/Results-inbox-panel";

export const metadata = createPageMetadata(
  "Results Inbox",
  "Results Inbox workspace in HealOS for hospital care and operations.",
);

export default function ResultsPanelPage() {
  return <ResultsPanel />;
}
