import { createPageMetadata } from "@/lib/seo/metadata";
import { AnalyserPanel } from "@/components/lab/lab-panels";

export const metadata = createPageMetadata(
  "Lab Analysers",
  "Lab Analysers workspace in HealOS for hospital care and operations.",
);

export default function AnalyserPanelPage() {
  return <AnalyserPanel />;
}
