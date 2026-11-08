import { EmergencyRecordPanel } from "@/components/emergency/panels/record-panel";

export default async function EmergencyRecordPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  return <EmergencyRecordPanel recordId={recordId} />;
}
