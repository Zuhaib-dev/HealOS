"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { PatientShell, type PatientSectionId } from "@/components/patient/patient-shell";
import {
  OverviewPanel,
  BookPanel,
  AppointmentsPanel,
  ReportsPanel,
  MedsPanel,
  BillingPanel,
  MessagesPanel,
  ProfilePanel,
} from "@/components/patient/patient-panels";

export default function PatientPage() {
  const [active, setActive] = useState<PatientSectionId>("overview");

  return (
    <RoleGuard allowedRoles={["PATIENT", "ADMIN"]}>
      <PatientShell active={active} onSelect={setActive}>
        {active === "overview" && <OverviewPanel />}
        {active === "book" && <BookPanel />}
        {active === "appointments" && <AppointmentsPanel />}
        {active === "reports" && <ReportsPanel />}
        {active === "meds" && <MedsPanel />}
        {active === "billing" && <BillingPanel />}
        {active === "messages" && <MessagesPanel />}
        {active === "profile" && <ProfilePanel />}
      </PatientShell>
    </RoleGuard>
  );
}
