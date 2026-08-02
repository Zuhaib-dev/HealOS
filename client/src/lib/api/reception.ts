import apiClient from "../api-client";

export interface AppointmentRecord {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
    department: string;
  };
  department: string;
  date: string;
  timeSlot: string;
  status: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  _id?: string;
}

export interface InvoiceRecord {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  issuedBy: string;
  appointment?: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod?: "CASH" | "CARD" | "UPI" | "INSURANCE";
  payer: string;
  insuranceCoverage: number;
  createdAt: string;
}

export const registerPatientApi = async (data: {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  abhaNumber?: string;
  payer: string;
  policyNumber?: string;
  department: string;
}) => {
  const response = await apiClient.post<{
    status: string;
    data: {
      patient: any;
      appointment: AppointmentRecord;
      token: string;
      invoice: InvoiceRecord;
    };
  }>("/reception/register", data);
  return response.data;
};

export const fetchQueueApi = async () => {
  const response = await apiClient.get<{
    status: string;
    data: { appointments: AppointmentRecord[] };
  }>("/reception/queue");
  return response.data;
};

export const fetchPendingBillsApi = async () => {
  const response = await apiClient.get<{
    status: string;
    data: { invoices: InvoiceRecord[] };
  }>("/reception/bills/pending");
  return response.data;
};

export const payBillApi = async (id: string, paymentMethod: string) => {
  const response = await apiClient.put<{
    status: string;
    data: { invoice: InvoiceRecord };
  }>(`/reception/bills/${id}/pay`, { paymentMethod });
  return response.data;
};
