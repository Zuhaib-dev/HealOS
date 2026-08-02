"use client";

import { useState } from "react";
import {
  Activity,
  Pill as PillIcon,
  Droplets,
  Bandage,
  ClipboardList,
  Bell,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell, type WorkspaceSection } from "@/components/workspace/workspace-shell";
import {
  VitalsRoundsPanel,
  EmarPanel,
  FluidPanel,
  WoundPanel,
  HandoverPanel,
  CallBellPanel,
} from "@/components/nurse/nurse-panels";

const sections = [
  { id: "rounds", label: "Vitals rounds", icon: Activity },
  { id: "emar", label: "eMAR", icon: PillIcon },
  { id: "fluids", label: "Fluid balance", icon: Droplets },
  { id: "wounds", label: "Wound care", icon: Bandage },
  { id: "handover", label: "Shift handover", icon: ClipboardList },
  { id: "bells", label: "Call bells", icon: Bell },
] as const satisfies readonly WorkspaceSection[];

export default function NursePage() {
  const [active, setActive] = useState<string>("rounds");

  return (
    <RoleGuard allowedRoles={["NURSE", "ADMIN"]}>
      <WorkspaceShell
        navId="nurse"
        breadcrumb="Ward operations / Nursing station"
        searchPlaceholder="Search bed, MRN, patient"
        sections={sections}
        active={active}
        onSelect={setActive}
        statusTitle="Shift"
        statusLine="Day shift · 07:00–19:00"
        statusNote="5 patients · 1 obs overdue · 2 bells waiting"
      >
        {active === "rounds" && <VitalsRoundsPanel />}
        {active === "emar" && <EmarPanel />}
        {active === "fluids" && <FluidPanel />}
        {active === "wounds" && <WoundPanel />}
        {active === "handover" && <HandoverPanel />}
        {active === "bells" && <CallBellPanel />}
      </WorkspaceShell>
    </RoleGuard>
  );
}
