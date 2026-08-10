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
