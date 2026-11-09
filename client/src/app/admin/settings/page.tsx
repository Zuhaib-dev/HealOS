import { createPageMetadata } from "@/lib/seo/metadata";
import { SettingsPanel } from "@/components/admin/panels/settings-panel";

export const metadata = createPageMetadata(
  "System Settings",
  "System Settings workspace in HealOS for hospital care and operations.",
);

export default function AdminSettingsPanelPage() {
  return <SettingsPanel />;
}
