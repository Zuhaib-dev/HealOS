"use client";

import {
  TestTube,
  ListChecks,
  Activity,
  CheckCircle,
  Siren,
  BarChart3,
} from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  {
    id: "collection",
    label: "Sample Collection",
    shortLabel: "Collection",
    icon: TestTube,
  },
  {
    id: "accession",
    label: "Accessioning",
    shortLabel: "Accession",
    icon: ListChecks,
  },
  {
    id: "analysers",
    label: "Auto-Analyzers",
    shortLabel: "Analyzers",
    icon: Activity,
  },
  {
    id: "validation",
    label: "Result Validation",
    shortLabel: "Validation",
    icon: CheckCircle,
  },
  {
    id: "critical",
    label: "Critical Results",
    shortLabel: "Critical",
    icon: Siren,
  },
  {
    id: "analytics",
    label: "Analytics",
    shortLabel: "Analytics",
    icon: BarChart3,
  },
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
