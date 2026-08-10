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

export interface FluidBalance {
  _id: string;
  patient: string;
  bed: string;
  intakeOral: number;
  intakeIV: number;
  outputUrine: number;
  outputDrain: number;
  target: number;
  restriction?: number;
}

export const fetchFluidBalancesApi = async () => {
  const response = await apiClient.get<{ success: boolean; fluids: FluidBalance[] }>("/nurse/fluids");
  return response.data;
};

export interface CallBell {
  _id: string;
  patient: string;
  bed: string;
  type: "call bell" | "bathroom" | "pain" | "IV alarm" | "emergency";
  raised: string;
  waitedSec: number;
  state: "waiting" | "accepted" | "closed";
  acceptedBy?: string;
}

export const fetchCallBellsApi = async () => {
  const response = await apiClient.get<{ success: boolean; callBells: CallBell[] }>("/nurse/call-bells");
  return response.data;
};

export interface MarDose {
  _id: string;
  patient: string;
  bed: string;
  drug: string;
  dose: string;
  route: "PO" | "IV" | "IM" | "SC" | "NEB" | "TOP";
  time: string;
  window: string;
  state: "due" | "overdue" | "given" | "held" | "refused";
  highAlert: boolean;
  controlled: boolean;
  note?: string;
}

export const fetchMarDosesApi = async () => {
  const response = await apiClient.get<{ success: boolean; doses: MarDose[] }>("/nurse/emar");
  return response.data;
};

export interface Wound {
  _id: string;
  patient: string;
  bed: string;
  site: string;
  type: string;
  stage: string;
  size: string;
  exudate: "nil" | "low" | "moderate" | "high";
  dressing: string;
  lastChange: string;
  nextChange: string;
  healing: number[];
  photoNote: string;
  overdue: boolean;
}

export const fetchWoundsApi = async () => {
  const response = await apiClient.get<{ success: boolean; wounds: Wound[] }>("/nurse/wounds");
  return response.data;
};

export interface NurseHandover {
  _id: string;
  patientName: string;
  bed: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  acuity: "critical" | "guarded" | "stable";
  status: "PENDING" | "ACKNOWLEDGED" | "COMPLETED";
}

export const fetchNurseHandoversApi = async () => {
  const response = await apiClient.get<{ success: boolean; handovers: NurseHandover[] }>("/nurse/handovers");
  return response.data;
};

