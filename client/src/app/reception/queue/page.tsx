import { createPageMetadata } from "@/lib/seo/metadata";
import { QueuePanel } from "@/components/reception/queue-panel";

export const metadata = createPageMetadata(
  "Patient Queue",
  "Patient Queue workspace in HealOS for hospital care and operations.",
);

export default function QueuePanelPage() {
  return <QueuePanel />;
}
