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
