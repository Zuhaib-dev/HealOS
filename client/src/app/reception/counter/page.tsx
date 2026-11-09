import { createPageMetadata } from "@/lib/seo/metadata";
import { CounterPanel } from "@/components/reception/counter-panel";

export const metadata = createPageMetadata(
  "Front Counter",
  "Front Counter workspace in HealOS for hospital care and operations.",
);

export default function CounterPanelPage() {
  return <CounterPanel />;
}
