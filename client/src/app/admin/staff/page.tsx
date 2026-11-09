import { createPageMetadata } from "@/lib/seo/metadata";
import { StaffPanel } from "@/components/admin/panels/staff-panel";

export const metadata = createPageMetadata(
  "Staff Management",
  "Staff Management workspace in HealOS for hospital care and operations.",
);

export default function AdminStaffPanelPage() {
  return <StaffPanel />;
}
