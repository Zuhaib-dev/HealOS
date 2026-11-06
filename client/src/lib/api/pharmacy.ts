import apiClient from "../api-client";

export interface PharmacyCatalogItem {
  _id: string;
  itemName: string;
  itemCode: string;
  category: string;
  currentStock: number;
  availableStock?: number;
  unit: string;
  unitPrice: number;
}

export interface PharmacySaleRecord {
  _id: string;
  consultation: string;
  patient: { _id: string; name: string; phone?: string };
  pharmacist?: { name: string };
  dispensedBy?: { name: string };
  invoice: {
    _id: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: string;
    paymentHistory?: { amount: number; method: string; paidAt: string }[];
    createdAt?: string;
  };
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number;
  status: "AWAITING_PAYMENT" | "DISPENSING" | "DISPENSED";
  dispensedAt?: string;
  createdAt: string;
}

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
  _id: string;
  patient: { _id: string; name: string; phone?: string };
  doctor: { _id: string; name: string };
  medicines: MedicineRecord[];
  createdAt: string;
  sale?: PharmacySaleRecord;
}

export async function fetchPharmacyCatalogApi() {
  const { data } = await apiClient.get<{
    success: boolean;
    items: PharmacyCatalogItem[];
  }>("/pharmacy/catalog");
  return data;
}

export async function fetchPendingPrescriptionsApi() {
  const { data } = await apiClient.get<{
    success: boolean;
    prescriptions: PendingPrescriptionRecord[];
  }>("/pharmacy/prescriptions/pending");
  return data;
}

export async function fetchPharmacyHistoryApi() {
  const { data } = await apiClient.get<{
    success: boolean;
    sales: PharmacySaleRecord[];
  }>("/pharmacy/prescriptions/history");
  return data;
}

export async function createPharmacyBillApi(
  consultationId: string,
  items: { medicineId?: string; inventoryItemId: string; quantity: number }[],
) {
  const { data } = await apiClient.post<{
    success: boolean;
    invoice: PharmacySaleRecord["invoice"];
    sale: PharmacySaleRecord;
  }>(`/pharmacy/prescriptions/${consultationId}/bill`, { items });
  return data;
}

export async function recordPharmacyCashApi(saleId: string) {
  const { data } = await apiClient.post(`/pharmacy/sales/${saleId}/cash`);
  return data;
}

export async function dispensePharmacySaleApi(saleId: string) {
  const { data } = await apiClient.post(`/pharmacy/sales/${saleId}/dispense`);
  return data;
}
