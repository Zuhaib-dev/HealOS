import { createPageMetadata } from "@/lib/seo/metadata";
import { InboundPanel } from "@/components/emergency/emergency-panels";

export const metadata = createPageMetadata(
  "Inbound EMS",
  "Inbound EMS workspace in HealOS for hospital care and operations.",
);

export default function InboundPanelPage() {
  return <InboundPanel />;
}
