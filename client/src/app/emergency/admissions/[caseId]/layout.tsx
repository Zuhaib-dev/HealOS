import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
export const metadata: Metadata = createPageMetadata(
  "ED Admission Handoff",
  "Emergency department admission handoff workspace.",
  { noIndex: true },
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
