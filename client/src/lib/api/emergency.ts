// ============================================
// HealOS Client — Emergency Department API
// ============================================
import apiClient from "../api-client";

export type EsiLevel = 1 | 2 | 3 | 4 | 5;

export type EmergencyDisposition =
  | "awaiting triage"
  | "in bay"
  | "awaiting bed"
  | "for discharge"
  | "admitted"
  | "transferred"
  | "deceased";

export interface EmergencyStatsData {
  totalInDept: number;
  awaitingTriage: number;
  medianTimeToClinician: string;
  fourHourBreaches: number;
}

export interface EmergencyRecordPage {
  cases: EmergencyCaseData[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface EmergencyPendingTask {
  caseId: string;
  patient: string;
  esi: EsiLevel;
  category: string;
  title: string;
  detail?: string;
  href: string;
  actionHref?: string;
  createdAt: string;
}

export async function fetchEmergencyRecordsApi(
  params: { page?: number; q?: string; status?: string } = {},
) {
  const response = await apiClient.get<
    EmergencyRecordPage & { success: boolean }
  >("/emergency/records", { params });
  return response.data;
}

export async function fetchEmergencyPendingApi() {
  const response = await apiClient.get<{
    success: boolean;
    tasks: EmergencyPendingTask[];
    counts: Record<string, number>;
    total: number;
    lookbackDays: number;
  }>("/emergency/pending");
  return response.data;
}

export async function fetchEmergencyRecordApi(id: string) {
  const response = await apiClient.get<{
    success: boolean;
    case: EmergencyCaseData;
    encounter: any;
    observations: any[];
    diagnostics: any[];
    administrations: any[];
    admission: any;
    pharmacy: any[];
  }>(`/emergency/records/${encodeURIComponent(id)}`);
  return response.data;
}

export interface EmergencyCaseData {
  _id: string;
  id: string; // e.g. "ED-4412"
  patient: string;
  age: number;
  sex: "M" | "F" | "O";
  complaint: string;
  esi: EsiLevel;
  arrived: string;
  arrivedAt: string;
  waitMin: number;
  area: string;
  obs: string;
  disposition: EmergencyDisposition;
  assignedDoctorName?: string;
  assignedDoctorId?: string;
  clinicianAssignedAt?: string;
  encounterStatus?: "DRAFT" | "COMPLETED";
  diagnosisSummary?: string;
  dischargedAt?: string;
  triageNotes?: string;
}

export interface EmergencyWardData {
  _id: string;
  name: string;
  code: string;
  department: string;
  capacity: number;
  currentOccupancy: number;
  available: number;
}

export interface EmergencyAdmissionData {
  _id: string;
  emergencyCase: string;
  ward: EmergencyWardData | string;
  admittedBy: { _id: string; name: string } | string;
  patientName: string;
  diagnosis: string;
  reason: string;
  status: "ACTIVE" | "DISCHARGED" | "TRANSFERRED";
  admittedAt: string;
  dischargedAt?: string;
  dischargeNote?: string;
}

export async function fetchEmergencyAdmissionApi(caseId: string) {
  const response = await apiClient.get<{
    success: boolean;
    case: EmergencyCaseData;
    admission: EmergencyAdmissionData | null;
    wards: EmergencyWardData[];
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/admission`);
  return response.data;
}

export async function createEmergencyAdmissionApi(
  caseId: string,
  payload: { wardId: string; reason: string },
) {
  const response = await apiClient.post<{
    success: boolean;
    admission: EmergencyAdmissionData;
    case: EmergencyCaseData;
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/admission`, payload);
  return response.data;
}

export async function closeEmergencyAdmissionApi(caseId: string, note: string) {
  const response = await apiClient.post<{
    success: boolean;
    admission: EmergencyAdmissionData;
    case: EmergencyCaseData;
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/admission/close`, {
    note,
  });
  return response.data;
}

export interface CreateEmergencyCasePayload {
  patientName: string;
  age: number;
  sex: "M" | "F" | "O";
  presentingComplaint: string;
  esi: EsiLevel;
  area?: string;
  observations?: string;
  disposition?: EmergencyDisposition;
  triageNotes?: string;
}

export interface EmergencyEncounterMedicine {
  _id?: string;
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  instructions?: string;
  isDispensed?: boolean;
}

export interface EmergencyEncounterData {
  _id?: string;
  chiefComplaint: string;
  assessment: string;
  diagnosis: string;
  advice: string;
  medicines: EmergencyEncounterMedicine[];
  diagnosticOrders: EmergencyDiagnosticOrderDraft[];
  status: "DRAFT" | "COMPLETED";
}

export interface EmergencyDiagnosticOrderDraft {
  testType: "PATHOLOGY" | "RADIOLOGY";
  testName: string;
  priority: "ROUTINE" | "URGENT" | "STAT";
  clinicalNotes?: string;
}

export interface EmergencyDiagnosticOrderResult extends EmergencyDiagnosticOrderDraft {
  _id: string;
  status: "PENDING" | "IN_PROGRESS" | "REPORTED" | "CANCELLED";
  accessionNumber?: string;
  reportedAt?: string;
  report?: {
    _id?: string;
    title?: string;
    comments?: string;
    findings?: string;
    state?: string;
    fileUrl?: string;
    isCritical?: boolean;
    structuredResults?: {
      analyteName: string;
      value: string;
      unit?: string;
      flag: string;
    }[];
  } | null;
}

export interface EmergencyMedicationAdministrationData {
  _id: string;
  medicineId: string;
  medicineName: string;
  dose: string;
  route: string;
  state: "GIVEN" | "HELD" | "REFUSED";
  recordedBy: { _id: string; name: string } | string;
  recordedAt: string;
  note?: string;
}

export async function fetchEmergencyMedicationChartApi(caseId: string) {
  const response = await apiClient.get<{
    success: boolean;
    case: EmergencyCaseData;
    consultation: {
      _id: string;
      medicines: EmergencyEncounterMedicine[];
    } | null;
    administrations: EmergencyMedicationAdministrationData[];
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/medications`);
  return response.data;
}

export async function recordEmergencyMedicationAdministrationApi(
  caseId: string,
  medicineId: string,
  payload: { state: "GIVEN" | "HELD" | "REFUSED"; note?: string },
) {
  const response = await apiClient.post<{
    success: boolean;
    administration: EmergencyMedicationAdministrationData;
  }>(
    `/emergency/cases/${encodeURIComponent(caseId)}/medications/${encodeURIComponent(medicineId)}/administrations`,
    payload,
  );
  return response.data;
}

export async function fetchEmergencyCaseApi(caseId: string) {
  const response = await apiClient.get<{
    success: boolean;
    case: EmergencyCaseData;
  }>(`/emergency/cases/${encodeURIComponent(caseId)}`);
  return response.data;
}

export async function fetchEmergencyEncounterApi(caseId: string) {
  const response = await apiClient.get<{
    success: boolean;
    case: EmergencyCaseData;
    encounter: EmergencyEncounterData | null;
    diagnostics: EmergencyDiagnosticOrderResult[];
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/encounter`);
  return response.data;
}

export async function saveEmergencyEncounterApi(
  caseId: string,
  encounter: EmergencyEncounterData,
) {
  const response = await apiClient.put<{
    success: boolean;
    case: EmergencyCaseData;
    consultation: EmergencyEncounterData;
    diagnostics: EmergencyDiagnosticOrderResult[];
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/encounter`, encounter);
  return response.data;
}

export interface ResusBayData {
  _id: string;
  id: string; // e.g. "Resus 1"
  state: "occupied" | "ready" | "cleaning" | "maintenance";
  patient: string;
  team: string;
  clock: string;
  airway: string;
  lines: string;
  next: string;
}

export interface InboundAmbulanceData {
  _id: string;
  unit: string;
  etaMinutes: number;
  presentingComplaint: string;
  esi: EsiLevel;
  crew: string;
  observations: string;
  prealert: boolean;
  assignedBay?: string;
  status: "en_route" | "arrived" | "diverted" | "cancelled";
}

export interface CreateInboundAmbulancePayload {
  unit: string;
  etaMinutes: number;
  presentingComplaint: string;
  esi: EsiLevel;
  crew: string;
  observations?: string;
  prealert: boolean;
}

export interface CascadeStepData {
  _id?: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface MajorIncidentData {
  _id: string;
  isConfigured: boolean;
  configuredAt?: string;
  configuredBy?: string;
  isArmed: boolean;
  armedAt?: string;
  armedBy?: string;
  surgeBeds?: number;
  theatresArmed?: number;
  staffRecalled?: number;
  steps: CascadeStepData[];
}

export interface MajorIncidentConfigPayload {
  surgeBeds: number;
  theatresArmed: number;
  staffRecalled: number;
  steps: Array<{ text: string; completed: false }>;
}

// ============================================
// API Functions
// ============================================

export interface EmergencyClinicianData {
  _id: string;
  name: string;
  role: "DOCTOR" | "EMERGENCY_DOCTOR";
}

export interface EmergencyObservationData {
  _id: string;
  recordedBy: { _id: string; name: string } | string;
  recordedAt: string;
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperatureC?: number;
  glasgowComaScale?: number;
  painScore?: number;
  note?: string;
}

export interface CreateEmergencyObservationPayload {
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperatureC?: number;
  glasgowComaScale?: number;
  painScore?: number;
  note?: string;
}

export async function fetchEmergencyObservationsApi(caseId: string) {
  const response = await apiClient.get<{
    success: boolean;
    observations: EmergencyObservationData[];
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/observations`);
  return response.data;
}

export async function createEmergencyObservationApi(
  caseId: string,
  payload: CreateEmergencyObservationPayload,
) {
  const response = await apiClient.post<{
    success: boolean;
    observation: EmergencyObservationData;
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/observations`, payload);
  return response.data;
}

export async function fetchEmergencyCliniciansApi() {
  const response = await apiClient.get<{
    success: boolean;
    clinicians: EmergencyClinicianData[];
  }>("/emergency/clinicians");
  return response.data;
}

export async function assignEmergencyCaseApi(
  caseId: string,
  doctorId: string | null,
) {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
    case: EmergencyCaseData;
  }>(`/emergency/cases/${encodeURIComponent(caseId)}/assignment`, { doctorId });
  return response.data;
}

export async function fetchMyEmergencyCasesApi() {
  const response = await apiClient.get<{
    success: boolean;
    cases: EmergencyCaseData[];
    count: number;
  }>("/emergency/cases/mine");
  return response.data;
}

/**
 * Fetch live Emergency department summary metrics
 */
export async function fetchEmergencyStatsApi() {
  const response = await apiClient.get<{
    success: boolean;
    stats: EmergencyStatsData;
  }>("/emergency/stats");
  return response.data;
}

/**
 * Fetch live triage cases (supports filters: 'all', 'esi12', 'waiting')
 */
export async function fetchTriageCasesApi(
  filter?: "all" | "esi12" | "waiting",
) {
  const response = await apiClient.get<{
    success: boolean;
    cases: EmergencyCaseData[];
    count: number;
    stats: EmergencyStatsData;
  }>("/emergency/cases", {
    params: filter && filter !== "all" ? { filter } : undefined,
  });
  return response.data;
}

/**
 * Intake a new emergency patient into the triage system
 */
export async function createEmergencyCaseApi(
  payload: CreateEmergencyCasePayload,
) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    case: EmergencyCaseData;
  }>("/emergency/cases", payload);
  return response.data;
}

/**
 * Update case disposition, area, ESI, or observations
 */
export async function updateEmergencyCaseApi(
  id: string,
  payload: Partial<
    Pick<CreateEmergencyCasePayload, "esi" | "area" | "observations">
  > & {
    disposition?: EmergencyDisposition;
    triageNotes?: string;
  },
) {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
    case: EmergencyCaseData;
  }>(`/emergency/cases/${id}`, payload);
  return response.data;
}

/**
 * Mark an emergency case for discharge
 */
export async function dischargeEmergencyCaseApi(id: string) {
  const response = await apiClient.delete<{
    success: boolean;
    message: string;
    case: EmergencyCaseData;
  }>(`/emergency/cases/${id}`);
  return response.data;
}

/**
 * Fetch all resus bays
 */
export async function fetchResusBaysApi() {
  const response = await apiClient.get<{
    success: boolean;
    bays: ResusBayData[];
  }>("/emergency/bays");
  return response.data;
}

export async function createResusBayApi(payload: {
  bayId: string;
  airway?: string;
  lines?: string;
}) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    bay: ResusBayData;
  }>("/emergency/bays", payload);
  return response.data;
}

/**
 * Update resus bay state, team, airway, lines, or next intervention
 */
export async function updateResusBayApi(
  id: string,
  payload: Partial<ResusBayData>,
) {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
    bay: ResusBayData;
  }>(`/emergency/bays/${id}`, payload);
  return response.data;
}

/**
 * Trigger immediate emergency resus team callout alert
 */
export async function callResusTeamApi(bayId: string) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
  }>(`/emergency/bays/${bayId}/call-team`);
  return response.data;
}

/**
 * Handover resus patient to ICU
 */
export async function handoverToIcuApi(bayId: string) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    bay: ResusBayData;
  }>(`/emergency/bays/${bayId}/handover-icu`);
  return response.data;
}

/**
 * Fetch all inbound ambulance units
 */
export async function fetchInboundAmbulancesApi() {
  const response = await apiClient.get<{
    success: boolean;
    units: InboundAmbulanceData[];
  }>("/emergency/inbound");
  return response.data;
}

export async function createInboundAmbulanceApi(
  payload: CreateInboundAmbulancePayload,
) {
  const response = await apiClient.post<{
    success: boolean;
    unit: InboundAmbulanceData;
  }>("/emergency/inbound", payload);
  return response.data;
}

export async function recordAmbulanceArrivalApi(
  unit: string,
  payload: { patientName: string; age: number; sex: "M" | "F" | "O" },
) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    case: EmergencyCaseData;
    unit: InboundAmbulanceData;
  }>(`/emergency/inbound/${encodeURIComponent(unit)}/arrive`, payload);
  return response.data;
}

/**
 * Assign a receiving bay to an incoming EMS ambulance unit
 */
export async function assignAmbulanceBayApi(unit: string, bay: string) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    unit: InboundAmbulanceData;
  }>(`/emergency/inbound/${encodeURIComponent(unit)}/assign-bay`, { bay });
  return response.data;
}

/**
 * Fetch Mass Casualty / Major Incident protocol state
 */
export async function fetchMajorIncidentApi() {
  const response = await apiClient.get<{
    success: boolean;
    incident: MajorIncidentData | null;
  }>("/emergency/incident");
  return response.data;
}

export async function saveMajorIncidentConfigApi(
  payload: MajorIncidentConfigPayload,
) {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    incident: MajorIncidentData;
  }>("/emergency/incident", payload);
  return response.data;
}

/**
 * Arm or Disarm Major Incident Mode
 */
export async function toggleMajorIncidentApi(armed: boolean) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    incident: MajorIncidentData;
  }>("/emergency/incident/toggle", { armed });
  return response.data;
}

/**
 * Check/uncheck an action cascade checklist item
 */
export async function toggleCascadeStepApi(
  stepIndex: number,
  completed?: boolean,
) {
  const response = await apiClient.patch<{
    success: boolean;
    step: CascadeStepData;
    incident: MajorIncidentData;
  }>(`/emergency/incident/step/${stepIndex}`, { completed });
  return response.data;
}
