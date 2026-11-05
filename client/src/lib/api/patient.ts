import apiClient from "../api-client";
import { AppointmentRecord } from "./appointment";
import { PatientProfileData } from "./onboarding";

export interface DashboardInvoice {
  _id: string;
  totalAmount: number;
  paidAmount?: number;
  insuranceCoverage?: number;
  paymentHistory?: {
    amount: number;
    method: "CASH" | "CARD" | "UPI" | "INSURANCE";
    source: "RAZORPAY" | "RECEPTION";
    paidAt: string;
  }[];
  status: "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";
  items: { description: string; amount: number }[];
  appointment?: {
    date: string;
    timeSlot: string;
    paidAmount?: number;
    amount?: number;
  };
  createdAt: string;
  paidAt?: string;
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
  followUpDate?: string;
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

export const updatePatientHealthProfileApi = async (
  data: Partial<PatientProfileData>,
) => {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    profile: PatientProfileData;
  }>("/patient/profile", data);
  return response.data;
};
