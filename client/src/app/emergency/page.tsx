"use client";

import { useState } from "react";
import { ListChecks, HeartPulse, Ambulance, Siren } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell, type WorkspaceSection } from "@/components/workspace/workspace-shell";
import {
  TriageBoardPanel,
  ResusPanel,
  InboundPanel,
  MajorIncidentPanel,
} from "@/components/emergency/emergency-panels";

const sections = [
  { id: "board", label: "Triage board", icon: ListChecks },
  { id: "resus", label: "Resus bays", icon: HeartPulse },
  { id: "inbound", label: "Ambulance inbound", icon: Ambulance },
  { id: "incident", label: "Major incident", icon: Siren },
] as const satisfies readonly WorkspaceSection[];

export default function EmergencyPage() {
  const [active, setActive] = useState<string>("board");

  return (
    <RoleGuard allowedRoles={["EMERGENCY_DOCTOR", "ADMIN"]}>
      <WorkspaceShell
        navId="emergency"
        breadcrumb="Urgent care / Emergency department"
        searchPlaceholder="Search ED ID, MRN, complaint"
        sections={sections}
        active={active}
        onSelect={setActive}
        statusTitle="Department"
        statusLine="34 in department"
        statusNote="2 resus occupied · 3 ambulances inbound"
      >
        {active === "board" && <TriageBoardPanel />}
        {active === "resus" && <ResusPanel />}
        {active === "inbound" && <InboundPanel />}
        {active === "incident" && <MajorIncidentPanel />}
      </WorkspaceShell>
    </RoleGuard>
  );
}
