// ============================================
// HealOS Client — Axios API Client
// ============================================
import axios from "axios";
import { useAuthStore } from "@/store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------
// Request Interceptor
// ---------------------------
apiClient.interceptors.request.use(
  (config) => {
    // Inject Bearer token from Zustand store / localStorage
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------
// Response Interceptor
// ---------------------------
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Automatically logout on 401 Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
