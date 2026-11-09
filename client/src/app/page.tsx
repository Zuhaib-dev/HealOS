import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
import HomePageClient from "./home-page-client";
export const metadata: Metadata = createPageMetadata(
  "Hospital Operations and Patient Care",
  "HealOS connects patient access, appointments, clinical workspaces, diagnostics, pharmacy, billing, and emergency department operations.",
  { canonical: "/" },
);
export default function HomePage() {
  return <HomePageClient />;
}
