"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { ActionButton, PanelHeader } from "../admin-shell";

/* ---------- shared primitives ---------- */

function Th({ children }: { children: React.ReactNode }) {
  return <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-b overflow-x-auto">
      <table className="w-full min-w-180 border-collapse">{children}</table>
    </div>
  );
}


import { fetchAdminStaffApi, AdminStaffData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- 03 staff ---------- */

export function StaffPanel() {
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [dbStaff, setDbStaff] = useState<AdminStaffData[]>([]);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminStaffApi();
      if (res.success && res.staff) {
        setDbStaff(res.staff);
      }
    } catch (err) {
      console.error("Failed to fetch admin staff", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadStaff);
  }, [loadStaff]);

  useAdminRealtime(["staff", "users", "roles", "approvals"], loadStaff);

  const depts = useMemo(() => ["All", ...new Set(dbStaff.map((s) => s.department || "General"))], [dbStaff]);
  const rows = filter === "All" ? dbStaff : dbStaff.filter((s) => (s.department || "General") === filter);

  return (
    <section>
      <PanelHeader
        index="03 / STAFF"
        title="Staff & access control"
        note="Roles, scoped permissions and live workload per member of the establishment."
        actions={<ActionButton tone="solid">Invite staff</ActionButton>}
      />
      <div className="hairline-b flex flex-wrap gap-1 px-5 py-3 sm:px-8">
        {depts.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d)}
            className={`mono-label px-3 py-1.5 ${
              filter === d ? "bg-accent/12 text-brass" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>ID</Th>
            <Th>Member</Th>
            <Th>Designation</Th>
            <Th>State</Th>
            <Th>Load</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
                Loading staff from MongoDB Atlas...
              </td>
            </tr>
          ) : rows.length > 0 ? (
            rows.map((s) => (
              <tr key={s._id} className="hairline-b">
                <Td>
                  <span className="mono-label text-muted-foreground">{s._id.slice(-6).toUpperCase()}</span>
                </Td>
                <Td>
                  <p className="font-medium">{s.user?.name || "Unknown"}</p>
                  <p className="mono-label text-muted-foreground mt-1 text-xs">
                    {s.department || "General"}
                  </p>
                </Td>
                <Td>
                  <select
                    value={s.user?.role || "USER"}
                    onChange={async (e) => {
                      const newRole = e.target.value;
                      if (!s.user?._id) return;
                      try {
                        const { updateUserRoleApi } = await import("@/lib/api/admin");
                        await updateUserRoleApi(s.user._id, newRole);
                        import("sonner").then(m => m.toast.success(`Role updated to ${newRole}`));
                        loadStaff();
                      } catch (err) {
                        import("sonner").then(m => m.toast.error("Failed to update role"));
                      }
                    }}
                    className="bg-transparent border border-(--hairline) px-2 py-1 text-xs mono-label outline-none focus:border-accent"
                  >
                    <option value="USER">USER</option>
                    <option value="PATIENT">PATIENT</option>
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="NURSE">NURSE</option>
                    <option value="PHARMACIST">PHARMACIST</option>
                    <option value="RADIOLOGIST">RADIOLOGIST</option>
                    <option value="LAB_TECHNICIAN">LAB_TECHNICIAN</option>
                    <option value="RECEPTIONIST">RECEPTIONIST</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </Td>
                <Td>
                  <Pill tone={s.status === "APPROVED" ? "ok" : s.status === "REJECTED" ? "bad" : "warn"}>
                    {s.status || "PENDING"}
                  </Pill>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="bg-foreground/[0.07] h-1.5 w-24">
                      <motion.div
                        className="bg-accent h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.status === "APPROVED" ? 100 : s.status === "REJECTED" ? 0 : 50}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <span className="mono-label text-muted-foreground">{s.status === "APPROVED" ? "Active" : "Review"}</span>
                  </div>
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-8 text-center mono-label text-xs text-muted-foreground">
                No staff profiles found.
              </td>
            </tr>
          )}
        </tbody>
      </TablePanel>
    </section>
  );
}
