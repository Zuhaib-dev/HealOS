"use client";

import { useState } from "react";
import { ListOrdered, HandHeart } from "lucide-react";
import { WorkspaceShell, type WorkspaceSection } from "@/components/workspace/workspace-shell";
import { RxQueuePanel, DispensePanel } from "@/components/pharmacy/pharmacy-panels";

const sections = [
  { id: "queue", label: "Rx queue", icon: ListOrdered },
  { id: "dispense", label: "Dispense & counsel", icon: HandHeart },
] as const satisfies readonly WorkspaceSection[];

export default function PharmacyPage() {
  const [active, setActive] = useState<string>("queue");

  return (
    <WorkspaceShell
      navId="pharmacy"
      breadcrumb="Medicines management / Pharmacy"
      searchPlaceholder="Search script, drug, SKU"
      sections={sections}
      active={active}
      onSelect={setActive}
      statusTitle="Dispensary"
      statusLine="Main pharmacy open"
      statusNote="Connected to backend"
    >
      {active === "queue" && <RxQueuePanel />}
      {active === "dispense" && <DispensePanel />}
    </WorkspaceShell>
  );
}
