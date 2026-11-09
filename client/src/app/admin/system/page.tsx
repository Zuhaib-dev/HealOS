import { createPageMetadata } from "@/lib/seo/metadata";
import { SystemHealthPanel } from "@/components/admin/panels/system-health-panel";
export const metadata = createPageMetadata(
  "System Health",
  "System Health workspace in HealOS for hospital care and operations.",
);

export default function SystemHealthPage() {
  return <SystemHealthPanel />;
}
