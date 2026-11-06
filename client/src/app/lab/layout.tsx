"use client";

import {
  TestTube,
  ListChecks,
  Activity,
  CheckCircle,
  Siren,
} from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "accession", label: "Accessioning", icon: ListChecks },
  { id: "analysers", label: "Auto-Analyzers", icon: Activity },
  { id: "validation", label: "Result Validation", icon: CheckCircle },
  { id: "critical", label: "Critical Results", icon: Siren },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["LAB_TECHNICIAN"]}>
      <WorkspaceShell
        navId="lab"
        breadcrumb="Diagnostics / Laboratory (LIS)"
        searchPlaceholder="Search accession, MRN, panel"
        sections={sections}

        statusTitle="Laboratory"
        statusLine="Live diagnostic queues"
        statusNote="Queue and result status update from lab records"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
