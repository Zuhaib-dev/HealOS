import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
import WorkspaceLayoutClient from "./workspace-layout-client";

export const metadata: Metadata = createPageMetadata(
  "Nursing Dashboard",
  "Nursing Dashboard workspace in HealOS.",
  { noIndex: true },
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayoutClient>{children}</WorkspaceLayoutClient>;
}
