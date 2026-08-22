"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["LAB_TECHNICIAN", "ADMIN"]}>
      <WorkspaceShell
        navId="lab"
        breadcrumb="Diagnostics / Laboratory (LIS)"
        searchPlaceholder="Search accession, MRN, panel"
        sections={sections}
        
        
        statusTitle="Bench"
        statusLine="LIS ↔ analysers linked"
        statusNote="128 samples in lab · 2 critical open"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
