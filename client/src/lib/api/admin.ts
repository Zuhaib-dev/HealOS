import apiClient from "../api-client";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedAdminParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
}

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
export async function fetchAdminUsersApi(params?: PaginatedAdminParams) {
  const response = await apiClient.get<{
    success: boolean;
    users: AdminUserData[];
    count: number;
    pagination: PaginationMeta;
  }>("/admin/users", { params });
  return response.data;
}

/**
 * Fetch all registered patient profiles
 */
export async function fetchAdminPatientsApi(params?: PaginatedAdminParams) {
  const response = await apiClient.get<{
    success: boolean;
    patients: AdminPatientData[];
    count: number;
    pagination: PaginationMeta;
  }>("/admin/patients", { params });
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

export interface AdminScheduleData {
  _id: string;
  user: { _id: string; name: string; email: string; phone?: string; avatarUrl?: string; role: string };
  date: string;
  startTime: string;
  endTime: string;
  shiftType: "REGULAR" | "ON_CALL" | "LEAVE";
  department?: string;
  notes?: string;
}

export async function fetchAdminScheduleApi(date?: string) {
  const url = date ? `/admin/schedule?date=${date}` : "/admin/schedule";
  const response = await apiClient.get<{
    success: boolean;
    appointments: AdminAppointmentData[];
    schedules: AdminScheduleData[];
  }>(url);
  return response.data;
}

export async function createScheduleApi(data: any) {
  const response = await apiClient.post<{ success: boolean; schedule: AdminScheduleData }>("/admin/schedule", data);
  return response.data;
}

export async function updateScheduleApi(id: string, data: any) {
  const response = await apiClient.put<{ success: boolean; schedule: AdminScheduleData }>(`/admin/schedule/${id}`, data);
  return response.data;
}

export async function deleteScheduleApi(id: string) {
  const response = await apiClient.delete<{ success: boolean }>(`/admin/schedule/${id}`);
  return response.data;
}

export interface AdminInvoiceData {
  _id: string;
  patient: { name: string; email?: string; phone?: string };
  totalAmount: number;
  status: string;
  type: string;
  paymentMethod?: string;
  payer?: string;
  items?: { description: string; amount: number }[];
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

export interface AdminRoleData {
  role: string;
  seats: number;
  scopes: Record<string, "full" | "read" | "none">;
}

export async function fetchAdminRolesApi() {
  const response = await apiClient.get<{
    success: boolean;
    permissionScopes: string[];
    roles: AdminRoleData[];
  }>("/admin/roles");
  return response.data;
}

export async function createWardApi(data: Partial<AdminWardData>) {
  const response = await apiClient.post<{ success: boolean; ward: AdminWardData }>("/admin/wards", data);
  return response.data;
}

export async function updateWardApi(id: string, data: Partial<AdminWardData>) {
  const response = await apiClient.put<{ success: boolean; ward: AdminWardData }>(`/admin/wards/${id}`, data);
  return response.data;
}

export async function deleteWardApi(id: string) {
  const response = await apiClient.delete<{ success: boolean }>(`/admin/wards/${id}`);
  return response.data;
}

export async function createInventoryItemApi(data: Partial<AdminInventoryData>) {
  const response = await apiClient.post<{ success: boolean; item: AdminInventoryData }>("/admin/inventory", data);
  return response.data;
}

export async function updateInventoryItemApi(id: string, data: Partial<AdminInventoryData>) {
  const response = await apiClient.put<{ success: boolean; item: AdminInventoryData }>(`/admin/inventory/${id}`, data);
  return response.data;
}

export async function deleteInventoryItemApi(id: string) {
  const response = await apiClient.delete<{ success: boolean }>(`/admin/inventory/${id}`);
  return response.data;
}
