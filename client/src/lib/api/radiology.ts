import apiClient from "../api-client";

export interface DiagnosticOrderRecord {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
  };
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  testType: "RADIOLOGY" | "PATHOLOGY";
  testName: string;
  priority: "ROUTINE" | "URGENT" | "STAT";
  clinicalNotes?: string;
  status: "PENDING" | "IN_PROGRESS" | "REPORTED" | "CANCELLED";
  report?: string;
  accessionNumber?: string;
  modality?: "CT" | "MRI" | "X-Ray" | "US" | "Mammo" | "PET-CT";
  room?: string;
  tatMin?: number;
  slaMin?: number;
  radiologist?: string;
  createdAt: string;
}

export interface ModalityMachineRecord {
  _id: string;
  room: string;
  modality: "CT" | "MRI" | "X-Ray" | "US" | "Mammo" | "PET-CT";
  state: "scanning" | "idle" | "maintenance" | "offline";
  vendor: string;
  queue: number;
  uptime: string;
  doseIndex: string;
  nextService: string;
}

export interface CriticalFindingRecord {
  _id: string;
  accession: string;
  patientName: string;
  finding: string;
  called: boolean;
  clinician: string;
  atTime: string;
}

export interface RadiologyBookingRecord {
  _id: string;
  time: string;
  room: string;
  patientName: string;
  study: string;
  state: "booked" | "open" | "blocked";
}

export interface ReportTemplateRecord {
  _id: string;
  label: string;
  body: string;
}

export interface StudyDocRecord {
  _id: string;
  order?: { accessionNumber: string, testName: string };
  patient?: { firstName: string, lastName: string };
  radiologist?: { firstName: string, lastName: string };
  uploadedBy?: string;
  kind: "PDF report" | "DICOM series" | "Scanned request" | "Prior report" | "Consent";
  fileName: string;
  fileSize: string;
  pages: number;
  state: "verified" | "pending sign" | "quarantined";
  createdAt: string;
}

export const fetchPendingOrdersApi = async () => {
  const response = await apiClient.get<{
    status: string;
    data: { orders: DiagnosticOrderRecord[] };
  }>("/radiology/orders");
  return response.data;
};

export const updateOrderStatusApi = async (id: string, status: "IN_PROGRESS" | "REPORTED" | "CANCELLED") => {
  const response = await apiClient.put<{
    status: string;
    data: { order: DiagnosticOrderRecord };
  }>(`/radiology/orders/${id}/status`, { status });
  return response.data;
};

export const uploadDiagnosticReportApi = async (id: string, formData: FormData) => {
  const response = await apiClient.post<{
    status: string;
    data: { report: any; order: DiagnosticOrderRecord };
  }>(`/radiology/orders/${id}/report`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const fetchDocumentsApi = async () => {
  const response = await apiClient.get<{ status: string; data: { documents: StudyDocRecord[] } }>("/radiology/documents");
  return response.data;
};

export const fetchTemplatesApi = async () => {
  const response = await apiClient.get<{ status: string; data: { templates: ReportTemplateRecord[] } }>("/radiology/templates");
  return response.data;
};

export const fetchModalitiesApi = async () => {
  const response = await apiClient.get<{ status: string; data: { modalities: ModalityMachineRecord[] } }>("/radiology/modalities");
  return response.data;
};

export const fetchCriticalFindingsApi = async () => {
  const response = await apiClient.get<{ status: string; data: { findings: CriticalFindingRecord[] } }>("/radiology/critical-findings");
  return response.data;
};

export const fetchBookingsApi = async () => {
  const response = await apiClient.get<{ status: string; data: { bookings: RadiologyBookingRecord[] } }>("/radiology/bookings");
  return response.data;
};

export const fetchStatsApi = async () => {
  const response = await apiClient.get<{ status: string; data: { stats: { label: string, value: string, note: string }[] } }>("/radiology/stats");
  return response.data;
};
