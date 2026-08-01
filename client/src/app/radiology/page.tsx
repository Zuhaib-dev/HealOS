"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import {
  RadiologyShell,
  type RadiologySectionId,
} from "@/components/radiology/radiology-shell";
import {
  WorklistPanel,
  UploadPanel,
  ReportingPanel,
  ArchivePanel,
  CriticalPanel,
  ModalitiesPanel,
  BookingPanel,
} from "@/components/radiology/radiology-panels";

export default function RadiologyPage() {
  const [active, setActive] = useState<RadiologySectionId>("worklist");

  return (
    <RoleGuard allowedRoles={["RADIOLOGIST", "ADMIN"]}>
      <RadiologyShell active={active} onSelect={setActive}>
        {active === "worklist" && <WorklistPanel />}
        {active === "upload" && <UploadPanel />}
        {active === "reporting" && <ReportingPanel />}
        {active === "archive" && <ArchivePanel />}
        {active === "critical" && <CriticalPanel />}
        {active === "modalities" && <ModalitiesPanel />}
        {active === "booking" && <BookingPanel />}
      </RadiologyShell>
    </RoleGuard>
  );
}
