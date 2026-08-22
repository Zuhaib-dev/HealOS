"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["PHARMACIST", "ADMIN"]}>
      <WorkspaceShell
        navId="pharmacy"
        breadcrumb="Medicines management / Pharmacy"
        searchPlaceholder="Search script, drug, SKU"
        sections={sections}
        
        
        statusTitle="Dispensary"
        statusLine="Main pharmacy open"
        statusNote="Connected to backend"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
