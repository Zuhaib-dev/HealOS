"use client";

import { useParams } from "next/navigation";
import { EmergencyEncounterPanel } from "@/components/emergency/panels/emergency-encounter-panel";

export default function EmergencyEncounterPage() {
  const params = useParams<{ caseId: string }>();
  return <EmergencyEncounterPanel caseId={params.caseId} />;
}
