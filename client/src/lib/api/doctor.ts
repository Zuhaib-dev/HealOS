import apiClient from "../api-client";

export interface IMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ConsultationPayload {
  patientId: string;
  appointmentId?: string;
  chiefComplaint: string;
  diagnosis: string;
  advice: string;
  medicines: IMedicine[];
  diagnosticOrders?: {
    testType: "RADIOLOGY" | "PATHOLOGY";
    testName: string;
    clinicalNotes?: string;
  }[];
  status: "DRAFT" | "COMPLETED";
  followUpDate?: string;
}

export interface DiagnosticOrderPayload {
  patientId: string;
  consultationId?: string;
  testType: "RADIOLOGY" | "PATHOLOGY";
  testName: string;
  priority: "ROUTINE" | "URGENT" | "STAT";
  clinicalNotes?: string;
}

export const getDoctorAppointmentsApi = async () => {
  const response = await apiClient.get("/doctor/appointments");
  return response.data;
};

export const saveConsultationApi = async (data: ConsultationPayload) => {
  const response = await apiClient.post("/doctor/consultations", data);
  return response.data;
};

export const orderDiagnosticApi = async (data: DiagnosticOrderPayload) => {
  const response = await apiClient.post("/doctor/diagnostic-orders", data);
  return response.data;
};

export const getPatientHistoryApi = async (patientId: string) => {
  const response = await apiClient.get(`/doctor/patients/${patientId}/history`);
  return response.data;
};

export const getDashboardStatsApi = async () => {
  const response = await apiClient.get("/doctor/dashboard-stats");
  return response.data;
};

export const getAssignedPatientsApi = async () => {
  const response = await apiClient.get("/doctor/patients");
  return response.data;
};

export const getDiagnosticResultsApi = async () => {
  const response = await apiClient.get("/doctor/diagnostic-reports");
  return response.data;
};

export const getOrdersAndMedsApi = async () => {
  const response = await apiClient.get("/doctor/orders-and-meds");
  return response.data;
};

export const getClinicalNotesApi = async () => {
  const response = await apiClient.get("/doctor/clinical-notes");
  return response.data;
};

export const createClinicalNoteApi = async (data: any) => {
  const response = await apiClient.post("/doctor/clinical-notes", data);
  return response.data;
};

export const getHandoversApi = async () => {
  const response = await apiClient.get("/doctor/handovers");
  return response.data;
};

export const createHandoverApi = async (data: any) => {
  const response = await apiClient.post("/doctor/handovers", data);
  return response.data;
};

export const getScheduleApi = async () => {
  const response = await apiClient.get("/doctor/schedule");
  return response.data;
};
