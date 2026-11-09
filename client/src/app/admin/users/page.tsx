import { createPageMetadata } from "@/lib/seo/metadata";
import { UsersPanel } from "@/components/admin/panels/users-panel";

export const metadata = createPageMetadata(
  "User Management",
  "User Management workspace in HealOS for hospital care and operations.",
);

export default function AdminUsersPanelPage() {
  return <UsersPanel />;
}
