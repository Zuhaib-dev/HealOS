// ============================================
// HealOS Client — Axios API Client
// ============================================
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

/**
 * Pre-configured Axios instance for all API requests.
 * - Base URL from env
 * - Credentials included for cookie-based auth
 * - Timeout for hung requests
 * - Interceptors for auth token injection & error handling
 */
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
    // Token injection will be added when auth is implemented
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
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
    // const originalRequest = error.config;

    // Handle 401 — token refresh will be added with auth
    // if (error.response?.status === 401 && !originalRequest._retry) {
    //   originalRequest._retry = true;
    //   try {
    //     await refreshToken();
    //     return apiClient(originalRequest);
    //   } catch {
    //     // Redirect to login
    //     window.location.href = "/login";
    //   }
    // }

    return Promise.reject(error);
  },
);

export default apiClient;
