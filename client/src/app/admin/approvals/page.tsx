import { createPageMetadata } from "@/lib/seo/metadata";
import { ApprovalsPanel } from "@/components/admin/panels/approvals-panel";

export const metadata = createPageMetadata(
  "Clinician Approvals",
  "Clinician Approvals workspace in HealOS for hospital care and operations.",
);

export default function AdminApprovalsPanelPage() {
  return <ApprovalsPanel />;
}
