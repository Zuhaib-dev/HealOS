import apiClient from "../api-client";
import { AuthUser } from "@/store/use-auth-store";

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  requiresVerification?: boolean;
}

export const registerUserApi = async (data: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/register", data);
  return response.data;
};

export const verifyOtpApi = async (data: {
  email: string;
  otp: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/verify-otp", data);
  return response.data;
};

export const resendOtpApi = async (email: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/resend-otp", { email });
  return response.data;
};

export const forgotPasswordApi = async (email: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/forgot-password", { email });
  return response.data;
};

export const resetPasswordApi = async (data: {
  email: string;
  otp: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/reset-password", data);
  return response.data;
};

export const loginUserApi = async (data: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/login", data);
  return response.data;
};

export const syncGoogleUserApi = async (data: {
  email: string;
  name: string;
  googleId: string;
  avatarUrl?: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/sync", data);
  return response.data;
};

export const fetchMeApi = async (): Promise<AuthResponse> => {
  const response = await apiClient.get<AuthResponse>("/auth/me");
  return response.data;
};

export const updatePhoneApi = async (phone: string): Promise<AuthResponse> => {
  const response = await apiClient.put<AuthResponse>("/auth/phone", { phone });
  return response.data;
};
