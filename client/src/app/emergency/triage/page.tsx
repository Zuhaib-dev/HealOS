import { createPageMetadata } from "@/lib/seo/metadata";
import { TriageBoardPanel } from "@/components/emergency/emergency-panels";

export const metadata = createPageMetadata(
  "ED Triage Board",
  "ED Triage Board workspace in HealOS for hospital care and operations.",
);

export default function TriagePage() {
  return <TriageBoardPanel />;
}
