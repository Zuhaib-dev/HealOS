"use client";

import { useParams } from "next/navigation";
import { EmergencyMedicationPanel } from "@/components/emergency/panels/emergency-medication-panel";

export default function EmergencyMedicationPage() {
  const params = useParams<{ caseId: string }>();
  return <EmergencyMedicationPanel caseId={params.caseId} />;
}
