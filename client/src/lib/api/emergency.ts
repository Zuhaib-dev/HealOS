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
  triageNotes?: string;
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
  progress: number;
  assignedBay?: string;
  status: "en_route" | "arrived" | "diverted" | "cancelled";
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
  isArmed: boolean;
  armedAt?: string;
  armedBy?: string;
  surgeBeds: number;
  theatresArmed: number;
  staffRecalled: number;
  steps: CascadeStepData[];
}

// ============================================
// API Functions
// ============================================

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
export async function fetchTriageCasesApi(filter?: "all" | "esi12" | "waiting") {
  const response = await apiClient.get<{
    success: boolean;
    cases: EmergencyCaseData[];
    count: number;
  }>("/emergency/cases", {
    params: filter && filter !== "all" ? { filter } : undefined,
  });
  return response.data;
}

/**
 * Intake a new emergency patient into the triage system
 */
export async function createEmergencyCaseApi(payload: CreateEmergencyCasePayload) {
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
  payload: Partial<CreateEmergencyCasePayload> & { disposition?: EmergencyDisposition }
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

/**
 * Update resus bay state, team, airway, lines, or next intervention
 */
export async function updateResusBayApi(
  id: string,
  payload: Partial<ResusBayData>
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

/**
 * Assign a receiving bay to an incoming EMS ambulance unit
 */
export async function assignAmbulanceBayApi(unit: string, bay: string) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    unit: InboundAmbulanceData;
  }>(`/emergency/inbound/${unit}/assign-bay`, { bay });
  return response.data;
}

/**
 * Fetch Mass Casualty / Major Incident protocol state
 */
export async function fetchMajorIncidentApi() {
  const response = await apiClient.get<{
    success: boolean;
    incident: MajorIncidentData;
  }>("/emergency/incident");
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
export async function toggleCascadeStepApi(stepIndex: number, completed?: boolean) {
  const response = await apiClient.patch<{
    success: boolean;
    step: CascadeStepData;
    incident: MajorIncidentData;
  }>(`/emergency/incident/step/${stepIndex}`, { completed });
  return response.data;
}
