"use client";

import { useState } from "react";
import { Syringe, Barcode, FlaskConical, CheckCheck, Siren } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell, type WorkspaceSection } from "@/components/workspace/workspace-shell";
import {
  CollectionPanel,
  AccessioningPanel,
  AnalyserPanel,
  ValidationPanel,
  CriticalPanel,
} from "@/components/lab/lab-panels";

const sections = [
  { id: "collection", label: "Collection", icon: Syringe },
  { id: "accession", label: "Accessioning", icon: Barcode },
  { id: "analysers", label: "Analyser worklist", icon: FlaskConical },
  { id: "validation", label: "Validation & release", icon: CheckCheck },
  { id: "critical", label: "Critical callback", icon: Siren },
] as const satisfies readonly WorkspaceSection[];

export default function LabPage() {
  const [active, setActive] = useState<string>("collection");

  return (
    <RoleGuard allowedRoles={["LAB_TECHNICIAN", "ADMIN"]}>
      <WorkspaceShell
        navId="lab"
        breadcrumb="Diagnostics / Laboratory (LIS)"
        searchPlaceholder="Search accession, MRN, panel"
        sections={sections}
        active={active}
        onSelect={setActive}
        statusTitle="Bench"
        statusLine="LIS ↔ analysers linked"
        statusNote="128 samples in lab · 2 critical open"
      >
        {active === "collection" && <CollectionPanel />}
        {active === "accession" && <AccessioningPanel />}
        {active === "analysers" && <AnalyserPanel />}
        {active === "validation" && <ValidationPanel />}
        {active === "critical" && <CriticalPanel />}
      </WorkspaceShell>
    </RoleGuard>
  );
}
