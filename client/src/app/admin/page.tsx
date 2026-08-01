"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AdminShell, type SectionId } from "@/components/admin/admin-shell";
import {
  OverviewPanel,
  ApprovalsPanel,
  StaffPanel,
  WardsPanel,
  BillingPanel,
  SuppliesPanel,
  AuditPanel,
  SettingsPanel,
} from "@/components/admin/admin-panels";
import {
  UsersPanel,
  PatientsPanel,
  SchedulePanel,
  RolesPanel,
  IntegrationsPanel,
} from "@/components/admin/admin-people-panels";

export default function AdminPage() {
  const [active, setActive] = useState<SectionId>("overview");

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AdminShell active={active} onSelect={setActive}>
        {active === "overview" && <OverviewPanel />}
        {active === "approvals" && <ApprovalsPanel />}
        {active === "users" && <UsersPanel />}
        {active === "patients" && <PatientsPanel />}
        {active === "schedule" && <SchedulePanel />}
        {active === "staff" && <StaffPanel />}
        {active === "roles" && <RolesPanel />}
        {active === "wards" && <WardsPanel />}
        {active === "billing" && <BillingPanel />}
        {active === "supplies" && <SuppliesPanel />}
        {active === "audit" && <AuditPanel />}
        {active === "integrations" && <IntegrationsPanel />}
        {active === "settings" && <SettingsPanel />}
      </AdminShell>
    </RoleGuard>
  );
}
