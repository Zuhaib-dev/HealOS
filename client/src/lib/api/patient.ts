import apiClient from "../api-client";

export interface PatientDashboardData {
  appointments: any[];
  consultations: any[];
  diagnosticOrders: any[];
  diagnosticReports: any[];
}

export const fetchPatientDashboardApi = async () => {
  const response = await apiClient.get<{
    status: string;
    data: PatientDashboardData;
  }>("/patient/dashboard");
  return response.data;
};
