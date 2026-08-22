"use client";

import { TestTube, ListChecks, Activity, CheckCircle, Siren } from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "collection", label: "Phlebotomy Queue", icon: TestTube },
  { id: "accession", label: "Accessioning", icon: ListChecks },
  { id: "analysers", label: "Auto-Analyzers", icon: Activity },
  { id: "validation", label: "Result Validation", icon: CheckCircle },
  { id: "critical", label: "Critical Results", icon: Siren },
];

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
