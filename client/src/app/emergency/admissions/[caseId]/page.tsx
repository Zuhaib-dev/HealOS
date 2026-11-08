"use client";

import { useParams } from "next/navigation";
import { EmergencyAdmissionPanel } from "@/components/emergency/panels/emergency-admission-panel";

export default function EmergencyAdmissionPage() {
  const params = useParams<{ caseId: string }>();
  return <EmergencyAdmissionPanel caseId={params.caseId} />;
}
