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

export function IntegrationsPanel() {
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbIntegrations, setDbIntegrations] = useState<AdminIntegrationData[]>([]);

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminIntegrationsApi();
      if (res.success && res.integrations) {
        setDbIntegrations(res.integrations);
      }
    } catch (err) {
      console.error("Failed to fetch admin integrations", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadIntegrations);
  }, [loadIntegrations]);

  useAdminRealtime(["integrations"], loadIntegrations);

  const services = dbIntegrations.filter(i => i.type === "SERVICE");
  const apiKeysList = dbIntegrations.filter(i => i.type === "API_KEY");

  return (
    <div>
      <PanelHeader
        index="11 / interop"
        title="Integrations & API keys"
        note="Every system HealOS speaks to, its health right now, and the credentials your own services use."
        actions={
          <ActionButton tone="solid">
            <span className="flex items-center gap-2">
              <Plus className="size-3" /> Add integration
            </span>
          </ActionButton>
        }
      />

      <div className="hairline-b grid sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse col-span-full">
            Loading integrations from database...
          </div>
        ) : services.length > 0 ? (
          services.map((i) => (
            <div key={i._id} className="hairline-l hairline-b px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-base font-bold">{i.name}</p>
                  <p className="mono-label text-muted-foreground mt-1">{i.category}</p>
                </div>
                {i.status === "connected" ? (
                  <Pill tone="ok">connected</Pill>
                ) : i.status === "degraded" ? (
                  <Pill tone="bad">degraded</Pill>
                ) : (
                  <Pill tone="mute">off</Pill>
                )}
              </div>
              <p className="mono-label text-muted-foreground mt-4">{i.detail}</p>
              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`size-1.5 rounded-full ${
                    i.status === "connected"
                      ? "bg-accent animate-pulse"
                      : i.status === "degraded"
                        ? "bg-destructive animate-pulse"
                        : "bg-muted-foreground/50"
                  }`}
                />
                <span className="mono-label text-muted-foreground">
                  {i.status === "off" ? "not exchanging data" : "heartbeat 30s"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center mono-label text-xs text-muted-foreground col-span-full">
            No service integrations found.
          </div>
        )}
      </div>

      <div className="px-5 py-6 sm:px-8">
        <p className="mono-label text-muted-foreground flex items-center gap-2">
          <KeyRound className="size-3.5" /> Service API keys
        </p>
        <div className="hairline mt-3">
          {loading ? (
            <div className="p-4 text-center mono-label text-xs text-muted-foreground animate-pulse">
              Loading keys...
            </div>
          ) : apiKeysList.length > 0 ? (
            apiKeysList.map((k) => (
              <div
                key={k._id}
                className="hairline-b flex flex-wrap items-center gap-4 px-4 py-3.5 last:border-b-0"
              >
                <span className="w-44 font-medium">{k.name}</span>
                <span className="mono-label text-brass">{k.keyPrefix}••••••••</span>
                <span className="mono-label text-muted-foreground">{k.scope}</span>
                <span className="mono-label text-muted-foreground ml-auto">
                  {k.lastUsed ? `used ${new Date(k.lastUsed).toLocaleDateString()}` : "never used"}
                </span>
                <button
                  type="button"
                  onClick={() => setCopied(k.keyPrefix || null)}
                  className="mono-label text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Copy className="size-3" /> {copied === k.keyPrefix ? "copied" : "copy"}
                </button>
              </div>
            ))
          ) : (
            <div className="p-4 text-center mono-label text-xs text-muted-foreground">
              No API keys generated.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
