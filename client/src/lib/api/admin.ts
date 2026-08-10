import apiClient from "../api-client";

export interface AdminUserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  phone?: string;
  createdAt: string;
}

export interface AdminPatientData {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
  };
  gender?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  isComplete: boolean;
  createdAt: string;
}

export interface FacilityStatsData {
  totalUsers: number;
  totalPatients: number;
  totalClinicians: number;
  totalAppointments: number;
  pendingApprovals: number;
}

/**
 * Fetch all registered users
 */
export async function fetchAdminUsersApi() {
  const response = await apiClient.get<{
    success: boolean;
    users: AdminUserData[];
    count: number;
  }>("/admin/users");
  return response.data;
}

/**
 * Fetch all registered patient profiles
 */
export async function fetchAdminPatientsApi() {
  const response = await apiClient.get<{
    success: boolean;
    patients: AdminPatientData[];
    count: number;
  }>("/admin/patients");
  return response.data;
}

/**
 * Fetch overall facility stats
 */
export async function fetchFacilityStatsApi() {
  const response = await apiClient.get<{
    success: boolean;
    stats: FacilityStatsData;
  }>("/admin/stats");
  return response.data;
}

/**
 * Directly update a user's role (e.g., promote to RADIOLOGIST or DOCTOR)
 */
export async function updateUserRoleApi(userId: string, role: string) {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
    user: AdminUserData;
  }>(`/admin/users/${userId}/role`, { role });
  return response.data;
}

export interface AdminStaffData {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    avatarUrl?: string;
  };
  department: string;
  status: string;
  designation: string;
}

export async function fetchAdminStaffApi() {
  const response = await apiClient.get<{
    success: boolean;
    staff: AdminStaffData[];
    count: number;
  }>("/admin/staff");
  return response.data;
}

export interface AdminAppointmentData {
  _id: string;
  patient: { user: { name: string } };
  doctor: { user: { name: string }; department: string };
  date: string;
  timeSlot: string;
  status: string;
  type: string;
}

export async function fetchAdminScheduleApi() {
  const response = await apiClient.get<{
    success: boolean;
    appointments: AdminAppointmentData[];
  }>("/admin/schedule");
  return response.data;
}

export interface AdminInvoiceData {
  _id: string;
  patient: { user: { name: string } };
  amount: number;
  status: string;
  type: string;
  createdAt: string;
}

export async function fetchAdminInvoicesApi() {
  const response = await apiClient.get<{
    success: boolean;
    invoices: AdminInvoiceData[];
    count: number;
  }>("/admin/invoices");
  return response.data;
}

export interface AdminWardData {
  _id: string;
  name: string;
  code: string;
  capacity: number;
  currentOccupancy: number;
  department: string;
}

export async function fetchAdminWardsApi() {
  const response = await apiClient.get<{
    success: boolean;
    wards: AdminWardData[];
  }>("/admin/wards");
  return response.data;
}

export interface AdminInventoryData {
  _id: string;
  itemName: string;
  itemCode: string;
  category: string;
  currentStock: number;
  reorderThreshold: number;
  unit: string;
}

export async function fetchAdminInventoryApi() {
  const response = await apiClient.get<{
    success: boolean;
    inventory: AdminInventoryData[];
  }>("/admin/inventory");
  return response.data;
}

export interface AdminAuditLogData {
  _id: string;
  actor: string;
  action: string;
  target?: string;
  level: "info" | "warn" | "crit";
  timestamp: string;
}

export async function fetchAdminAuditLogsApi() {
  const response = await apiClient.get<{
    success: boolean;
    logs: AdminAuditLogData[];
  }>("/admin/audit-logs");
  return response.data;
}

export interface AdminIntegrationData {
  _id: string;
  type: "SERVICE" | "API_KEY";
  name?: string;
  category?: string;
  status?: "connected" | "degraded" | "off";
  detail?: string;
  keyPrefix?: string;
  scope?: string;
  lastUsed?: string;
}

export async function fetchAdminIntegrationsApi() {
  const response = await apiClient.get<{
    success: boolean;
    integrations: AdminIntegrationData[];
  }>("/admin/integrations");
  return response.data;
}
