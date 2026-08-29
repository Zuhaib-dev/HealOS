import apiClient from "../api-client";

export interface MedicineRecord {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  isDispensed?: boolean;
}

export interface PendingPrescriptionRecord {
  _id: string; // Consultation ID
  patient: {
    _id: string;
    name: string;
    phone?: string;
  };
  doctor: {
    _id: string;
    name: string;
  };
  medicines: MedicineRecord[];
  createdAt: string;
}

export const fetchPendingPrescriptionsApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    prescriptions: PendingPrescriptionRecord[];
  }>("/pharmacy/prescriptions/pending");
  return response.data;
};

export const fetchPharmacyHistoryApi = async () => {
  const response = await apiClient.get<{
    success: boolean;
    prescriptions: PendingPrescriptionRecord[];
  }>("/pharmacy/prescriptions/history");
  return response.data;
};

export const dispenseMedicineApi = async (consultationId: string, medicineId: string) => {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
  }>(`/pharmacy/prescriptions/${consultationId}/dispense`, {
    medicineId,
  });
  return response.data;
};

export const createPharmacyBillApi = async (consultationId: string, cartItems: any[], totalAmount: number) => {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    invoice: any;
  }>(`/pharmacy/prescriptions/${consultationId}/bill`, {
    cartItems,
    totalAmount,
  });
  return response.data;
};
