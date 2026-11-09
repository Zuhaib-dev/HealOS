import { createPageMetadata } from "@/lib/seo/metadata";
import { RolesPanel } from "@/components/admin/panels/roles-panel";

export const metadata = createPageMetadata(
  "Roles and Access",
  "Roles and Access workspace in HealOS for hospital care and operations.",
);

export default function AdminRolesPanelPage() {
  return <RolesPanel />;
}
