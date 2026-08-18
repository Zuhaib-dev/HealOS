import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchPatientDashboardApi, PatientDashboardData } from "../lib/api/patient";
import { getSocket } from "../lib/socket";
import { toast } from "sonner";

export const usePatientDashboard = () => {
  const queryClient = useQueryClient();

  const query = useQuery<PatientDashboardData>({
    queryKey: ["patient-dashboard"],
    queryFn: fetchPatientDashboardApi,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    const socket = getSocket();

    // Listen to real-time events for the patient
    const onAppointmentUpdated = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast.info("Appointment updated", { description: "Your appointment status has changed." });
    };

    const onInvoiceUpdated = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast.info("Invoice updated", { description: "A billing record was updated." });
    };

    const onReportReady = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["patient-dashboard"] });
      toast.success("New Lab/Radiology Report", { description: "A new diagnostic report is ready to view." });
    };

    socket.on("appointment_updated", onAppointmentUpdated);
    socket.on("invoice_updated", onInvoiceUpdated);
    socket.on("report_ready", onReportReady);

    return () => {
      socket.off("appointment_updated", onAppointmentUpdated);
      socket.off("invoice_updated", onInvoiceUpdated);
      socket.off("report_ready", onReportReady);
    };
  }, [queryClient]);

  return query;
};
