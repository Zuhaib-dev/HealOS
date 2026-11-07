import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  fetchPatientDashboardApi,
  PatientDashboardData,
} from "../lib/api/patient";
import { getSocket } from "../lib/socket";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";

export const usePatientDashboard = (
  view?: "overview" | "appointments" | "medications",
) => {
  const queryClient = useQueryClient();
  const patientId = useAuthStore((state) => state.user?.id);

  const query = useQuery<PatientDashboardData>({
    // Keep patient records isolated when different accounts use the same tab.
    queryKey: ["patient-dashboard", patientId, view || "full"],
    queryFn: () => fetchPatientDashboardApi(view),
    enabled: Boolean(patientId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    const socket = getSocket();

    // Listen to real-time events for the patient
    const onAppointmentUpdated = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast.info("Appointment updated", {
        description: "Your appointment status has changed.",
      });
    };

    const onInvoiceUpdated = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast.info("Invoice updated", {
        description: "A billing record was updated.",
      });
    };

    const onReportReady = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast.success("New Lab/Radiology Report", {
        description: "A new diagnostic report is ready to view.",
      });
    };

    socket.on("appointment_updated", onAppointmentUpdated);
    socket.on("invoice_updated", onInvoiceUpdated);
    socket.on("invoice_paid", onInvoiceUpdated);
    socket.on("report_ready", onReportReady);
    socket.on("lab_report_validated", onReportReady);

    return () => {
      socket.off("appointment_updated", onAppointmentUpdated);
      socket.off("invoice_updated", onInvoiceUpdated);
      socket.off("invoice_paid", onInvoiceUpdated);
      socket.off("report_ready", onReportReady);
      socket.off("lab_report_validated", onReportReady);
    };
  }, [queryClient]);

  return query;
};
