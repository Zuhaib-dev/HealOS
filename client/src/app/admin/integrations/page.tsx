import { createPageMetadata } from "@/lib/seo/metadata";
import { IntegrationsPanel } from "@/components/admin/panels/integrations-panel";

export const metadata = createPageMetadata(
  "Integrations",
  "Integrations workspace in HealOS for hospital care and operations.",
);

export default function AdminIntegrationsPanelPage() {
  return <IntegrationsPanel />;
}
