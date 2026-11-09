import { createPageMetadata } from "@/lib/seo/metadata";
import { CallBellsPanel } from "@/components/nurse/panels/call-bells-panel";

export const metadata = createPageMetadata(
  "Call Bell Queue",
  "Call Bell Queue workspace in HealOS for hospital care and operations.",
);

export default function CallBellPanelPage() {
  return <CallBellsPanel />;
}
