import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";

import { RoleGuard } from "@/components/auth/role-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = createPageMetadata(
  "Admin Dashboard",
  "Admin Dashboard workspace in HealOS.",
  { noIndex: true },
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}
