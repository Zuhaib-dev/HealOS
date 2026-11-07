"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { AdminHeader } from "../admin-header";
import {
  fetchAdminUsersApi,
  updateUserRoleApi,
  AdminUserData,
  PaginationMeta,
} from "@/lib/api/admin";
import { toast } from "sonner";
import { useAdminRealtime } from "../use-admin-realtime";

import {
  getApiErrorMessage,
  TableWrap,
  Th,
  Td,
  PaginationControls,
  Avatar,
} from "./shared";

export function UsersPanel() {
  const [dbUsers, setDbUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminUsersApi({
        page,
        limit: 10,
        q: query || undefined,
      });
      if (res.success && res.users) {
        setDbUsers(res.users);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch admin users", err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  useAdminRealtime(["users", "roles"], loadUsers);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await updateUserRoleApi(userId, newRole);
      if (res.success) {
        toast.success(`User role updated to ${newRole} in real-time!`);
        setDbUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
        );
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update user role"));
    }
  };

  const verifiedCount = dbUsers.filter((u) => u.isEmailVerified).length;
  const visibleUsers = dbUsers.filter((u) => {
    if (filter === "verified") return u.isEmailVerified;
    if (filter === "unverified") return !u.isEmailVerified;
    return true;
  });

  return (
    <div>
      <AdminHeader
        title="Users"
        note="Staff and system accounts. Patient records are managed in the patient registry."
      />

      <div className="hairline-b grid grid-cols-2 sm:grid-cols-4">
        {[
          {
            label: "Total accounts",
            value: pagination ? String(pagination.total) : "—",
          },
          { label: "This page", value: String(dbUsers.length) },
          { label: "Verified (page)", value: String(verifiedCount) },
          {
            label: "Unverified (page)",
            value: String(dbUsers.length - verifiedCount),
          },
        ].map((m) => (
          <div key={m.label} className="hairline-l px-5 py-4">
            <p className="mono-label text-muted-foreground">{m.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="hairline-b flex gap-1 px-5 py-3 sm:px-8">
        <input
          aria-label="Search users by name, email, phone, or role"
          title="Search users by name, email, phone, or role"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email, phone, or role (e.g. Doctor, Admin)"
          className="mono-label hairline placeholder:text-muted-foreground mr-3 w-full max-w-xs bg-transparent px-3 py-2 outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
        />
        {(
          [
            ["all", "All users"],
            ["verified", "Verified"],
            ["unverified", "Unverified"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`mono-label px-3 py-1.5 ${
              filter === id
                ? "bg-accent/12 text-brass"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Verified</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={5}
                className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse"
              >
                Loading accounts…
              </td>
            </tr>
          ) : visibleUsers.length > 0 ? (
            visibleUsers.map((u) => {
              return (
                <tr
                  key={u._id}
                  className="border-b border-border/40 hover:bg-muted/30 transition-colors group"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u.name || u.email}
                        online={u.isEmailVerified}
                      />
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {u.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {u._id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">
                      {u.email}
                    </span>
                  </Td>
                  <Td>
                    <select
                      aria-label={`Change role for ${u.name}`}
                      value={u.role || "USER"}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="bg-background/50 border border-border/60 rounded-md px-2 py-1.5 text-xs mono-label outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="USER">USER</option>
                      <option value="DOCTOR">DOCTOR</option>
                      <option value="RADIOLOGIST">RADIOLOGIST</option>
                      <option value="RECEPTIONIST">RECEPTIONIST</option>
                      <option value="PHARMACIST">PHARMACIST</option>
                      <option value="NURSE">NURSE</option>
                      <option value="EMERGENCY_DOCTOR">EMERGENCY_DOCTOR</option>
                      <option value="LAB_TECHNICIAN">LAB_TECHNICIAN</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </Td>
                  <Td>
                    {u.isEmailVerified ? (
                      <span className="text-brass flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5" />
                        <span className="mono-label">Verified</span>
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1.5">
                        <ShieldOff className="size-3.5" />
                        <span className="mono-label">Unverified</span>
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="mono-label">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </Td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="p-16 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                    <UserCog className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="mono-label text-muted-foreground">
                    No user accounts found.
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </TableWrap>
      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </div>
  );
}

/* ---------- 04 · Patient registry ---------- */
