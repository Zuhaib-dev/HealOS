import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
export const metadata: Metadata = createPageMetadata(
  "ED Medication Chart",
  "Emergency department medication chart workspace.",
  { noIndex: true },
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
