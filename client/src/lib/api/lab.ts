import apiClient from "../api-client";

export const fetchLabCollectionsApi = async () => {
  const response = await apiClient.get("/lab/collections");
  return response.data;
};

export const fetchLabHistoryApi = async (page = 1, limit = 10, search = "") => {
  const response = await apiClient.get(
    `/lab/reports/history?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );
  return response.data;
};

export const markLabCollectedApi = async (id: string, barcode: string) => {
  const response = await apiClient.patch(`/lab/collections/${id}/collect`, {
    barcode,
  });
  return response.data;
};

export const receiveLabSpecimenApi = async (id: string, barcode: string) =>
  (await apiClient.patch(`/lab/specimens/${id}/receive`, { barcode })).data;

export const rejectLabSpecimenApi = async (
  id: string,
  barcode: string,
  reason: string,
) =>
  (await apiClient.patch(`/lab/specimens/${id}/reject`, { barcode, reason }))
    .data;

export const recollectLabSpecimenApi = async (id: string, barcode: string) =>
  (await apiClient.patch(`/lab/specimens/${id}/recollect`, { barcode })).data;

export const submitLabResultsApi = async (
  id: string,
  barcode: string,
  results: { analyteCode: string; value: number }[],
) =>
  (await apiClient.post(`/lab/specimens/${id}/results`, { barcode, results }))
    .data;

export const recordLabCashPaymentApi = async (id: string) => {
  const response = await apiClient.post(`/lab/collections/${id}/cash`);
  return response.data;
};

export const createLabBillApi = async (id: string, price: number) => {
  const response = await apiClient.post(`/lab/collections/${id}/bill`, {
    price,
  });
  return response.data;
};

export const fetchLabSamplesApi = async () => {
  const response = await apiClient.get("/lab/samples");
  return response.data;
};

export const fetchLabValidationApi = async () => {
  const response = await apiClient.get("/lab/validation");
  return response.data;
};

export const validateLabReportApi = async (id: string) => {
  const response = await apiClient.patch(`/lab/validation/${id}`);
  return response.data;
};

export const recordLabCriticalCallbackApi = async (
  id: string,
  contactId: string,
  readBackConfirmed: boolean,
  escalationLevel: number,
  note?: string,
) => {
  const response = await apiClient.patch(`/lab/critical/${id}/callback`, {
    contactId,
    readBackConfirmed,
    escalationLevel,
    note,
  });
  return response.data;
};

export const fetchLabAnalysersApi = async () => {
  const response = await apiClient.get("/lab/analysers");
  return response.data;
};

export const createLabAnalyserApi = async (data: {
  name: string;
  discipline: string;
}) => (await apiClient.post("/lab/analysers", data)).data;

export const updateLabAnalyserApi = async (
  id: string,
  data: Record<string, unknown>,
) => (await apiClient.patch(`/lab/analysers/${id}`, data)).data;

export const rotateLabAnalyserTokenApi = async (id: string) =>
  (await apiClient.post(`/lab/analysers/${id}/token`)).data;

export const recordLabAnalyserQCApi = async (
  id: string,
  data: { passed: boolean; controlLot: string; notes?: string },
) => (await apiClient.post(`/lab/analysers/${id}/qc`, data)).data;

export const fetchLabAnalyserWorklistApi = async (id: string) =>
  (await apiClient.get(`/lab/analysers/${id}/worklist`)).data;

export const assignLabAnalyserWorklistApi = async (
  id: string,
  orderIds: string[],
) => (await apiClient.post(`/lab/analysers/${id}/worklist`, { orderIds })).data;

export const fetchLabAnalytesApi = async () =>
  (await apiClient.get("/lab/analytes")).data;

export const saveLabAnalyteApi = async (data: Record<string, unknown>) =>
  (await apiClient.post("/lab/analytes", data)).data;

export const fetchLabCriticalContactsApi = async () =>
  (await apiClient.get("/lab/critical/contacts")).data;

export const saveLabCriticalContactApi = async (
  data: Record<string, unknown>,
) => (await apiClient.post("/lab/critical/contacts", data)).data;

export const fetchLabAnalyticsApi = async (days: 7 | 30 | 90) =>
  (await apiClient.get(`/lab/analytics?days=${days}`)).data;

export const fetchLabCriticalValuesApi = async () => {
  const response = await apiClient.get("/lab/critical");
  return response.data;
};

export const fetchLabStatsApi = async () => {
  const response = await apiClient.get("/lab/stats");
  return response.data;
};

export const uploadLabReportApi = async (
  orderId: string,
  formData: FormData,
) => {
  const response = await apiClient.post(
    `/lab/reports/${orderId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};
