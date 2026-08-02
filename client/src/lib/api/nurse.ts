import apiClient from "../api-client";

export interface VitalsQueueItem {
  appointment: {
    _id: string;
    department: string;
    date: string;
    timeSlot: string;
    reason: string;
    status: string;
    patient: {
      _id: string;
      name: string;
      phone?: string;
      gender?: string;
      dateOfBirth?: string;
    };
    doctor: {
      _id: string;
      name: string;
    };
  };
  vitals: VitalsRecord | null;
  hasVitals: boolean;
}

export interface VitalsRecord {
  _id: string;
  patient: string;
  appointment?: string;
  recordedBy: { _id: string; name: string } | string;
  heartRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  temperature?: number;
  bloodPressure?: string;
  weight?: number;
  height?: number;
  notes?: string;
  createdAt: string;
}

export const fetchVitalsQueueApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    queue: VitalsQueueItem[];
  }>("/nurse/queue");
  return response.data;
};

export const recordVitalsApi = async (data: {
  patientId: string;
  appointmentId?: string;
  heartRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  temperature?: number;
  bloodPressure?: string;
  weight?: number;
  height?: number;
  notes?: string;
}) => {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    vitals: VitalsRecord;
  }>("/nurse/vitals", data);
  return response.data;
};

export const fetchPatientVitalsApi = async (patientId: string) => {
  const response = await apiClient.get<{
    success: boolean;
    vitals: VitalsRecord[];
  }>(`/nurse/vitals/${patientId}`);
  return response.data;
};
