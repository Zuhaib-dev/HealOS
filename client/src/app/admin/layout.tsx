import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | HealOS",
  description: "Hospital administration, staff management, and analytics.",
};

import { RoleGuard } from "@/components/auth/role-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}
