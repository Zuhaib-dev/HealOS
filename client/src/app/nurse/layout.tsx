"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["NURSE", "ADMIN"]}>
      <WorkspaceShell
        navId="nurse"
        breadcrumb="Ward operations / Nursing station"
        searchPlaceholder="Search bed, MRN, patient"
        sections={sections}
        
        
        statusTitle="Shift"
        statusLine="Day shift · 07:00–19:00"
        statusNote="5 patients · 1 obs overdue · 2 bells waiting"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
