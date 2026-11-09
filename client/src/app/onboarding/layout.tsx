import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
export const metadata: Metadata = createPageMetadata(
  "HealOS Onboarding",
  "Complete your account profile and workspace setup.",
  { noIndex: true },
);
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
