import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
export const metadata: Metadata = createPageMetadata(
  "Contact HealOS",
  "Contact the HealOS team about hospital workflows and platform capabilities.",
  { canonical: "/contact" },
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
