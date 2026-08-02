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
