"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { LogOut, KeyRound, ShieldCheck, ShieldOff, Copy, Plus, UserCog, HeartPulse } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";
import {
  fetchAdminUsersApi,
  fetchAdminPatientsApi,
  fetchAdminScheduleApi,
  createScheduleApi,
  fetchAdminStaffApi,
  fetchAdminIntegrationsApi,
  fetchAdminRolesApi,
  updateUserRoleApi,
  AdminUserData,
  AdminPatientData,
  AdminAppointmentData,
  AdminScheduleData,
  AdminStaffData,
  AdminIntegrationData,
  AdminRoleData,
  PaginationMeta,
} from "@/lib/api/admin";
import { toast } from "sonner";
import { useAdminRealtime } from "../use-admin-realtime";

import { getApiErrorMessage, Th, Td, Pill, PaginationControls, initials, Avatar } from "./shared";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export function PatientsPanel() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["adminPatients", page, q],
    queryFn: async () => {
      const res = await fetchAdminPatientsApi({ page, limit: 10, q: q || undefined });
      if (!res.success) throw new Error("Failed to fetch");
      return res;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const dbPatients = data?.patients || [];
  const pagination = data?.pagination || null;

  useAdminRealtime(["patients", "users"], () => {
    queryClient.invalidateQueries({ queryKey: ["adminPatients"] });
  });

  return (
    <div>
      <PanelHeader
        index="04 / registry"
        title="Patient registry"
        note="Registered health profile census with blood group, emergency contacts and verification signals."
        actions={
          <>
            <ActionButton>Export census</ActionButton>
            <ActionButton tone="solid">Admit patient</ActionButton>
          </>
        }
      />
      <div className="hairline-b px-5 py-3 sm:px-8">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by name or email"
          className="mono-label hairline placeholder:text-muted-foreground w-full max-w-xs bg-transparent px-3 py-2 outline-none"
        />
      </div>
      <div className="mx-5 sm:mx-8 mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5 border-collapse">
            <thead>
              <tr>
              <Th>Patient ID</Th>
              <Th>Patient Name</Th>
              <Th>Gender / Blood</Th>
              <Th>Emergency Contact</Th>
              <Th>Emergency Phone</Th>
              <Th>Registered On</Th>
              <Th>Profile Status</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center mono-label text-xs text-muted-foreground animate-pulse">
                  Loading patient registry...
                </td>
              </tr>
            ) : dbPatients.length > 0 ? (
              dbPatients.map((p) => (
                <tr key={p._id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                  <Td>
                    <span className="font-mono text-muted-foreground">{p._id.slice(-8).toUpperCase()}</span>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={p.user?.name || "Patient"} online={true} />
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{p.user?.name || "Anonymous Patient"}</p>
                        <p className="mono-label text-[11px] text-muted-foreground">{p.user?.email}</p>
                      </div>
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label">
                      {p.gender || "N/A"} · <span className="font-bold text-primary">{p.bloodGroup || "N/A"}</span>
                    </span>
                  </Td>
                  <Td>{p.emergencyContactName || "—"}</Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{p.emergencyPhone || p.user?.phone || "—"}</span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </Td>
                  <Td>
                    {p.isComplete ? (
                      <Pill tone="ok">Active Patient</Pill>
                    ) : (
                      <Pill tone="warn">Incomplete</Pill>
                    )}
                  </Td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                      <HeartPulse className="size-6 text-muted-foreground/60" />
                    </div>
                    <p className="mono-label text-muted-foreground">No patient profiles found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </div>
  );
}

/* ---------- 05 · Theatre schedule ---------- */
