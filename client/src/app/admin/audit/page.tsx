import { createPageMetadata } from "@/lib/seo/metadata";
import { AuditPanel } from "@/components/admin/panels/audit-panel";

export const metadata = createPageMetadata(
  "Audit Log",
  "Audit Log workspace in HealOS for hospital care and operations.",
);

export default function AdminAuditPanelPage() {
  return <AuditPanel />;
}
