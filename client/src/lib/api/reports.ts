import apiClient from "../api-client";

export async function openProtectedReport(reportId: string, download = false) {
  const tab = download ? null : window.open("about:blank", "_blank");
  try {
    const response = await apiClient.get(`/reports/${reportId}/file`, {
      responseType: "blob",
    });
    if (response.data.type === "application/json") {
      const payload = JSON.parse(await response.data.text()) as {
        externalUrl?: string;
      };
      if (!payload.externalUrl) throw new Error("Report URL is unavailable");
      if (download) {
        const link = document.createElement("a");
        link.href = payload.externalUrl;
        link.download = `report-${reportId}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (tab) {
        tab.location.href = payload.externalUrl;
      }
      return;
    }
    const url = URL.createObjectURL(response.data);
    if (download) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${reportId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else if (tab) {
      tab.location.href = url;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
