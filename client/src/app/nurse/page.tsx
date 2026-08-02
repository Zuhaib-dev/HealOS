"use client";

import { useState } from "react";
import { Activity, ClipboardList } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell, type WorkspaceSection } from "@/components/workspace/workspace-shell";
import { VitalsRoundsPanel, HandoverPanel } from "@/components/nurse/nurse-panels";

const sections = [
  { id: "rounds", label: "Vitals rounds", icon: Activity },
  { id: "handover", label: "Shift handover", icon: ClipboardList },
] as const satisfies readonly WorkspaceSection[];

export default function NursePage() {
  const [active, setActive] = useState<string>("rounds");

  return (
    <RoleGuard allowedRoles={["NURSE", "ADMIN"]}>
      <WorkspaceShell
        navId="nurse"
        breadcrumb="Ward operations / Nursing station"
        searchPlaceholder="Search patient, MRN"
        sections={sections}
        active={active}
        onSelect={setActive}
        statusTitle="Shift"
        statusLine="Day shift active"
        statusNote="Connected to backend"
      >
        {active === "rounds" && <VitalsRoundsPanel />}
        {active === "handover" && <HandoverPanel />}
      </WorkspaceShell>
    </RoleGuard>
  );
}
