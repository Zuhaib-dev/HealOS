"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AdminHeader } from "../admin-header";
import { fetchAdminRolesApi, AdminRoleData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

import { TableWrap, Th, Td, Pill } from "./shared";

export function RolesPanel() {
  const [loading, setLoading] = useState(true);
  const [permissionScopes, setPermissionScopes] = useState<string[]>([]);
  const [roles, setRoles] = useState<AdminRoleData[]>([]);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminRolesApi();
      if (res.success) {
        setPermissionScopes(res.permissionScopes);
        setRoles(res.roles);
      }
    } catch (err) {
      console.error("Failed to fetch admin roles", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRoles);
  }, [loadRoles]);

  useAdminRealtime(["roles", "users"], loadRoles);

  return (
    <div>
      <AdminHeader
        title="Roles"
        note="What each seat can do. Changes apply on the next sign-in."
      />
      <TableWrap minWidth="min-w-[40rem]">
        <thead>
          <tr>
            <Th>Role</Th>
            <Th>Seats</Th>
            {permissionScopes.map((s) => (
              <Th key={s}>{s}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={permissionScopes.length + 2}
                className="p-12 text-center mono-label text-xs text-muted-foreground animate-pulse"
              >
                Loading role seats...
              </td>
            </tr>
          ) : roles.length > 0 ? (
            roles.map((r) => (
              <tr
                key={r.role}
                className="border-b border-border/40 hover:bg-muted/30 transition-colors group"
              >
                <Td>
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {r.role}
                  </span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">
                    {r.seats}
                  </span>
                </Td>
                {permissionScopes.map((s) => {
                  const v = r.scopes[s] ?? "none";
                  return (
                    <Td key={s}>
                      {v === "full" ? (
                        <Pill tone="ok">full</Pill>
                      ) : v === "read" ? (
                        <Pill tone="warn">read</Pill>
                      ) : (
                        <span className="mono-label text-muted-foreground">
                          —
                        </span>
                      )}
                    </Td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={permissionScopes.length + 2}
                className="p-16 text-center"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                    <ShieldCheck className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="mono-label text-muted-foreground">
                    No roles found.
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}

/* ---------- 11 · Integrations & keys ---------- */
