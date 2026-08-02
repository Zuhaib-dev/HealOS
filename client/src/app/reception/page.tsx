"use client";

import { useState } from "react";
import { UserPlus, Ticket, Banknote } from "lucide-react";
import { WorkspaceShell, type WorkspaceSection } from "@/components/workspace/workspace-shell";
import { RegistrationPanel } from "@/components/reception/registration-panel";
import { QueuePanel } from "@/components/reception/queue-panel";
import { CounterPanel } from "@/components/reception/counter-panel";
import { useAuthStore } from "@/store/use-auth-store";

const sections = [
  { id: "registration", label: "Registration", icon: UserPlus },
  { id: "queue", label: "Token & queue", icon: Ticket },
  { id: "counter", label: "Cash counter", icon: Banknote },
] as const satisfies readonly WorkspaceSection[];

export default function ReceptionPage() {
  const [active, setActive] = useState<string>("registration");
  const { user } = useAuthStore();

  return (
    <WorkspaceShell
      navId="reception"
      breadcrumb="Access & flow / Front desk (OPD)"
      searchPlaceholder="Search MRN, mobile, ABHA"
      sections={sections}
      active={active}
      onSelect={setActive}
      user={{ name: user?.name || "Front Desk", role: "Front desk · counter 2", initials: "FD" }}
      statusTitle="Counter"
      statusLine="Counter 2 open"
      statusNote="23 tokens waiting · float balanced"
    >
      {active === "registration" && <RegistrationPanel />}
      {active === "queue" && <QueuePanel />}
      {active === "counter" && <CounterPanel />}
    </WorkspaceShell>
  );
}
