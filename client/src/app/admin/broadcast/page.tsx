import { createPageMetadata } from "@/lib/seo/metadata";
import { BroadcastPanel } from "@/components/admin/panels/broadcast-panel";
export const metadata = createPageMetadata(
  "System Broadcasts",
  "System Broadcasts workspace in HealOS for hospital care and operations.",
);

export default function BroadcastPage() {
  return <BroadcastPanel />;
}
