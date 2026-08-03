import apiClient from "../api-client";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type AppointmentType = "IN_PERSON" | "TELECONSULT" | "EMERGENCY";
export type PaymentMethod = "ONLINE" | "CASH";
export type PaymentStatus = "PAID" | "PENDING_CASH" | "REFUNDED";

export interface DoctorListItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  specialization: string;
  degree: string;
}

export interface AppointmentRecord {
  _id: string;
  patient: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
  doctor: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    role?: string;
  };
  department: string;
  date: string;
  timeSlot: string;
  reason: string;
  type: AppointmentType;
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  bookedAt: string;
  notes?: string;
  createdAt: string;
}

export interface BookAppointmentPayload {
  doctorId: string;
  department: string;
  date: string;
  timeSlot: string;
  reason: string;
  type?: AppointmentType;
  paymentMethod?: PaymentMethod;
}

export const fetchAvailableDoctorsApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    doctors: DoctorListItem[];
  }>("/appointments/doctors-list");
  return response.data;
};

export const bookAppointmentApi = async (payload: BookAppointmentPayload) => {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    appointment: AppointmentRecord;
  }>("/appointments/book", payload);
  return response.data;
};

export const fetchPatientAppointmentsApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    appointments: AppointmentRecord[];
  }>("/appointments/patient");
  return response.data;
};

export const fetchDoctorAppointmentsApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    appointments: AppointmentRecord[];
  }>("/appointments/doctor");
  return response.data;
};

export const updateAppointmentStatusApi = async (
  id: string,
  status: AppointmentStatus,
  notes?: string
) => {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    appointment: AppointmentRecord;
  }>(`/appointments/${id}/status`, { status, notes });
  return response.data;
};

export const cancelAppointmentApi = async (id: string) => {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
  }>(`/appointments/${id}/cancel`);
  return response.data;
};
