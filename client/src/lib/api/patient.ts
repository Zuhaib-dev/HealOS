import apiClient from "../api-client";
import { AppointmentRecord } from "./appointment";
import { PatientProfileData } from "./onboarding";

export interface DashboardInvoice {
  _id: string;
  totalAmount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  items: { description: string; amount: number }[];
  appointment?: {
    date: string;
    timeSlot: string;
  };
  createdAt: string;
}

export interface DashboardVitals {
  _id: string;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  spO2: number;
  createdAt: string;
}

export interface DashboardConsultation {
  _id: string;
  doctor: {
    name: string;
    role: string;
  };
  diagnosis: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    isDispensed: boolean;
  }[];
  createdAt: string;
}

export interface DashboardDiagnosticReport {
  _id: string;
  patient: string;
  title: string;
  category: "LAB" | "RADIOLOGY";
  fileUrl?: string;
  findings: string;
  uploadedBy: {
    name: string;
  };
  createdAt: string;
}

export interface PatientDashboardData {
  profile: PatientProfileData | null;
  appointments: AppointmentRecord[];
  consultations: DashboardConsultation[];
  diagnosticOrders: any[];
  diagnosticReports: DashboardDiagnosticReport[];
  vitals: DashboardVitals[];
  invoices: DashboardInvoice[];
}

export const fetchPatientDashboardApi = async () => {
  const response = await apiClient.get<{
    status: string;
    data: PatientDashboardData;
  }>("/patient/dashboard");
  return response.data.data;
};

export const updatePatientHealthProfileApi = async (data: Partial<PatientProfileData>) => {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    profile: PatientProfileData;
  }>("/patient/profile", data);
  return response.data;
};

// In this mockup, we simulate paying an invoice directly via the reception endpoint (since invoice is handled via reception/billing typically), but for patient self-pay, we can just use a simulated endpoint or we can add a simple payment API on reception routes. Actually, let's create a pay endpoint on reception or billing. We'll use a mocked API call here for the frontend since there is no server endpoint for self-pay yet.
export const payInvoiceApi = async (id: string) => {
  // Let's call a reception endpoint if we created one, or we can just make it part of reception routes. 
  // Wait, let's add it to reception routes in the backend later if needed, or just simulate it here.
  const response = await apiClient.post<{ success: boolean }>(`/patient/invoices/${id}/pay`, { paymentMethod: "CARD" });
  return response.data;
};
