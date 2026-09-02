import { apiClient } from "../api-client";

export interface ReceptionOverviewData {
  registrations: {
    total: number;
    newToday: number;
    repeatToday: number;
    note: string;
  };
  tokens: {
    waiting: number;
    avgWaitMinutes: number;
    note: string;
  };
  collections: {
    total: number;
    value: string;
    subValue: string;
    breakdown: string;
    note: string;
  };
  insurance: {
    value: string;
    subValue: string;
    capturedCount: number;
    totalChecked: number;
    note: string;
  };
  recentQueue: Array<{
    id: string;
    tokenNumber: string;
    patientName: string;
    department: string;
    doctorName: string;
    timeSlot: string;
    status: string;
    waitMinutes: number;
  }>;
}

export interface AppointmentRecord {
  _id: string;
  token?: string;
  patient?: {
    _id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  doctor?: {
    _id: string;
    name?: string;
    department?: string;
  };
  department: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface InvoiceRecord {
  _id: string;
  invoiceNumber?: string;
  patient?: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  items: InvoiceItem[];
  totalAmount: number;
  status: "PENDING" | "PAID" | "CANCELLED" | string;
  paymentMethod?: "CASH" | "CARD" | "UPI" | "INSURANCE" | string;
  payer?: string;
  insuranceCoverage?: number;
  createdAt: string;
}

export interface RegisterPatientPayload {
  firstName: string;
  lastName?: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  department: string;
  payer?: string;
}

export const fetchReceptionOverviewApi = async (): Promise<{
  success: boolean;
  data: ReceptionOverviewData;
}> => {
  const res = await apiClient.get("/reception/overview");
  return res.data;
};

export const fetchQueueApi = async (): Promise<{
  status: string;
  data: { appointments: AppointmentRecord[] };
}> => {
  const res = await apiClient.get("/reception/queue");
  return res.data;
};

export const fetchPendingBillsApi = async (): Promise<{
  status: string;
  data: { invoices: InvoiceRecord[] };
}> => {
  const res = await apiClient.get("/reception/bills/pending");
  return res.data;
};

export const payBillApi = async (
  invoiceId: string,
  paymentMethod: string
): Promise<{
  status: string;
  data: { invoice: InvoiceRecord };
}> => {
  const res = await apiClient.put(`/reception/bills/${invoiceId}/pay`, {
    paymentMethod,
  });
  return res.data;
};

export const registerPatientApi = async (
  payload: RegisterPatientPayload
): Promise<{
  status: string;
  data: {
    patient: any;
    appointment: any;
    token: string;
    invoice: any;
  };
}> => {
  const res = await apiClient.post("/reception/register", payload);
  return res.data;
};
