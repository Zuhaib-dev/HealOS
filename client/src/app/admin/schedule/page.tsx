import { createPageMetadata } from "@/lib/seo/metadata";
import { SchedulePanel } from "@/components/admin/panels/schedule-panel";

export const metadata = createPageMetadata(
  "Theatre Schedule",
  "Theatre Schedule workspace in HealOS for hospital care and operations.",
);

export default function AdminSchedulePanelPage() {
  return <SchedulePanel />;
}
