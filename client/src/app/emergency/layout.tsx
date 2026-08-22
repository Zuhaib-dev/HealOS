"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["EMERGENCY_DOCTOR", "ADMIN"]}>
      <WorkspaceShell
        navId="emergency"
        breadcrumb="Urgent care / Emergency department"
        searchPlaceholder="Search ED ID, MRN, complaint"
        sections={sections}
        
        
        statusTitle="Department"
        statusLine="34 in department"
        statusNote="2 resus occupied · 3 ambulances inbound"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
