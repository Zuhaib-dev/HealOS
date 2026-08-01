"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorShell, type DoctorSectionId } from "@/components/doctor/doctor-shell";
import {
  ShiftPanel,
  RoundsPanel,
  ClinicPanel,
  ResultsPanel,
  OrdersPanel,
  NotesPanel,
  HandoverPanel,
  RotaPanel,
} from "@/components/doctor/doctor-panels";

export default function DoctorPage() {
  const [active, setActive] = useState<DoctorSectionId>("shift");

  return (
    <RoleGuard allowedRoles={["DOCTOR", "ADMIN"]}>
      <DoctorShell active={active} onSelect={setActive}>
        {active === "shift" && <ShiftPanel />}
        {active === "rounds" && <RoundsPanel />}
        {active === "clinic" && <ClinicPanel />}
        {active === "results" && <ResultsPanel />}
        {active === "orders" && <OrdersPanel />}
        {active === "notes" && <NotesPanel />}
        {active === "handover" && <HandoverPanel />}
        {active === "rota" && <RotaPanel />}
      </DoctorShell>
    </RoleGuard>
  );
}
