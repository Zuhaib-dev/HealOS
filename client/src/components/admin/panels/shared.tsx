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

/* ---------- local primitives ---------- */

export function getApiErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as { response?: { data?: { message?: string } } };
  return maybeError.response?.data?.message || fallback;
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground bg-muted/40 px-5 py-4 text-left font-semibold border-b border-border/60 backdrop-blur-md sticky top-0">{children}</th>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-middle text-sm ${className}`}>{children}</td>;
}

export function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const map = {
    ok: "bg-accent/15 text-brass shadow-[0_0_8px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/15 text-destructive shadow-[0_0_8px_color-mix(in_oklab,var(--color-destructive)_15%,transparent)]",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2.5 py-1 rounded-md ${map[tone]}`}>{children}</span>;
}

export function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta | null;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="hairline-b flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
      <p className="mono-label text-muted-foreground">
        Page {pagination.page} of {pagination.pages} · {pagination.total} records
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="mono-label hairline px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
          className="mono-label hairline px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function initials(name: string) {
  return name
    .replace(/^(Dr\.|Nurse)\s+/i, "")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Monogram avatar with a live presence ring — no raster assets. */
export function Avatar({ name, online }: { name: string; online: boolean }) {
  return (
    <span className="relative inline-grid size-9 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full">
        <rect x="1" y="1" width="38" height="38" fill="none" stroke="var(--hairline)" />
        {online && (
          <motion.rect
            x="1"
            y="1"
            width="38"
            height="38"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeDasharray="152"
            initial={{ strokeDashoffset: 152, opacity: 0.9 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
        )}
      </svg>
      <span className={`mono-label relative ${online ? "text-brass" : "text-muted-foreground"}`}>
        {initials(name)}
      </span>
    </span>
  );
}

/* ---------- 03 · Users & sessions ---------- */
