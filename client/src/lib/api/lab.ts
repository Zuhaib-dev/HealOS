import apiClient from "../api-client";

export const fetchLabCollectionsApi = async () => {
  const response = await apiClient.get("/lab/collections");
  return response.data;
};

export const markLabCollectedApi = async (id: string) => {
  const response = await apiClient.patch(`/lab/collections/${id}/collect`);
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

export const fetchLabAnalysersApi = async () => {
  const response = await apiClient.get("/lab/analysers");
  return response.data;
};

export const fetchLabCriticalValuesApi = async () => {
  const response = await apiClient.get("/lab/critical");
  return response.data;
};

export const fetchLabStatsApi = async () => {
  const response = await apiClient.get("/lab/stats");
  return response.data;
};
