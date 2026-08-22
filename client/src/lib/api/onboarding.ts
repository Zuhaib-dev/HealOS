import apiClient from "../api-client";

export type ProfessionalStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface ProfessionalProfileData {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  } | string;
  requestedRole: "DOCTOR" | "RADIOLOGIST";
  degree: string;
  specialization: string;
  experienceYears: number;
  licenseNumber: string;
  documentUrls: string[];
  status: ProfessionalStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface PatientProfileData {
  _id?: string;
  dob?: string;
  gender?: "MALE" | "FEMALE";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
  emergencyPhone?: string;
  emergencyContactName?: string;
  allergies?: string[];
  medicalHistory?: string;
  address?: string;
  height?: number;
  heightUnit?: "cm" | "ft";
  weight?: number;
  isComplete: boolean;
}

export interface ApplyRolePayload {
  requestedRole: "DOCTOR" | "RADIOLOGIST";
  degree: string;
  specialization: string;
  experienceYears: number;
  licenseNumber: string;
  documentUrls?: string[];
}

export const updatePatientProfileApi = async (payload: Partial<PatientProfileData>) => {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    profile: PatientProfileData;
  }>("/onboarding/patient-profile", payload);
  return response.data;
};

export const fetchPatientProfileApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    profile: PatientProfileData | null;
  }>("/onboarding/patient-profile");
  return response.data;
};

export const applyForClinicianRoleApi = async (payload: ApplyRolePayload) => {
  const response = await apiClient.post("/onboarding/apply", payload);
  return response.data;
};

export const fetchMyOnboardingStatusApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    profile: ProfessionalProfileData | null;
  }>("/onboarding/my-status");
  return response.data;
};

export const fetchPendingOnboardingRequestsApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    profiles: ProfessionalProfileData[];
  }>("/onboarding/requests");
  return response.data;
};

export const approveOnboardingRequestApi = async (id: string) => {
  const response = await apiClient.put(`/onboarding/${id}/approve`);
  return response.data;
};

export const rejectOnboardingRequestApi = async (id: string, rejectionReason: string) => {
  const response = await apiClient.put(`/onboarding/${id}/reject`, { rejectionReason });
  return response.data;
};
