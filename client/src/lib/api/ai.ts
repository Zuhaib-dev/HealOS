import apiClient from "../api-client";

export const generateBioApi = async (role: string, keywords: string) => {
  const response = await apiClient.post("/ai/generate-bio", { role, keywords });
  return response.data;
};
