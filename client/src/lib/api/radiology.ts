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
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  report?: string;
  createdAt: string;
}

export const fetchPendingOrdersApi = async () => {
  const response = await apiClient.get<{
    status: string;
    data: { orders: DiagnosticOrderRecord[] };
  }>("/radiology/orders");
  return response.data;
};

export const updateOrderStatusApi = async (id: string, status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED") => {
  const response = await apiClient.put<{
    status: string;
    data: { order: DiagnosticOrderRecord };
  }>(`/radiology/orders/${id}/status`, { status });
  return response.data;
};

export const uploadDiagnosticReportApi = async (id: string, formData: FormData) => {
  // Use multipart/form-data for file upload
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
