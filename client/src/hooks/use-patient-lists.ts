import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPatientBillingApi,
  fetchPatientRecordsApi,
} from "@/lib/api/patient";
import { useAuthStore } from "@/store/use-auth-store";
import { getSocket } from "@/lib/socket";

export function usePatientBilling(page: number, pageSize = 10) {
  const patientId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ["patient-billing", patientId],
      });
    };
    socket.on("invoice_updated", refresh);
    socket.on("invoice_paid", refresh);
    return () => {
      socket.off("invoice_updated", refresh);
      socket.off("invoice_paid", refresh);
    };
  }, [patientId, queryClient]);

  return useQuery({
    queryKey: ["patient-billing", patientId, page, pageSize],
    queryFn: () => fetchPatientBillingApi(page, pageSize),
    enabled: Boolean(patientId),
    staleTime: 60 * 1000,
  });
}

export function usePatientRecords(page: number, pageSize = 10, query = "") {
  const patientId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ["patient-records", patientId],
      });
    };
    socket.on("report_ready", refresh);
    socket.on("lab_report_validated", refresh);
    return () => {
      socket.off("report_ready", refresh);
      socket.off("lab_report_validated", refresh);
    };
  }, [patientId, queryClient]);

  return useQuery({
    queryKey: ["patient-records", patientId, page, pageSize, query],
    queryFn: () => fetchPatientRecordsApi(page, pageSize, query),
    enabled: Boolean(patientId),
    staleTime: 60 * 1000,
  });
}
