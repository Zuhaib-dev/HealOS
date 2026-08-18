import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { LogOut, KeyRound, ShieldCheck, ShieldOff, Copy, Plus } from "lucide-react";
import { ActionButton, PanelHeader } from "./admin-shell";
import {
  fetchAdminUsersApi,
  fetchAdminPatientsApi,
  fetchAdminScheduleApi,
  fetchAdminIntegrationsApi,
  fetchAdminRolesApi,
  updateUserRoleApi,
  AdminUserData,
  AdminPatientData,
  AdminAppointmentData,
  AdminIntegrationData,
  AdminRoleData,
  PaginationMeta,
} from "@/lib/api/admin";
import { toast } from "sonner";
import { useAdminRealtime } from "./use-admin-realtime";

/* ---------- local primitives ---------- */

function getApiErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as { response?: { data?: { message?: string } } };
  return maybeError.response?.data?.message || fallback;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function PaginationControls({
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

function initials(name: string) {
  return name
    .replace(/^(Dr\.|Nurse)\s+/i, "")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Monogram avatar with a live presence ring — no raster assets. */
function Avatar({ name, online }: { name: string; online: boolean }) {
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

export function UsersPanel() {
  const [dbUsers, setDbUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [revoked, setRevoked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminUsersApi({ page, limit: 10, q: query || undefined });
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
          prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
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
      <PanelHeader
        index="03 / identity"
        title="Users & sessions"
        note="Live system accounts registered across MongoDB Atlas Cloud — role, verification status and security."
        actions={
          <>
            <ActionButton>Invite user</ActionButton>
            <ActionButton tone="solid">Force global sign-out</ActionButton>
          </>
        }
      />

      <div className="hairline-b grid grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Accounts", value: String(dbUsers.length) },
          { label: "Verified Users", value: String(verifiedCount) },
          { label: "Unverified", value: String(dbUsers.length - verifiedCount) },
          { label: "Sessions Revoked", value: String(revoked.length) },
        ].map((m) => (
          <div key={m.label} className="hairline-l px-5 py-4">
            <p className="mono-label text-muted-foreground">{m.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="hairline-b flex gap-1 px-5 py-3 sm:px-8">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email or phone"
          className="mono-label hairline placeholder:text-muted-foreground mr-3 w-full max-w-xs bg-transparent px-3 py-2 outline-none"
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
              filter === id ? "bg-accent/12 text-brass" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-250">
          <thead className="hairline-b">
            <tr>
              <Th>User</Th>
              <Th>Email</Th>
              <Th>Role / dept</Th>
              <Th>2FA</Th>
              <Th>Device</Th>
              <Th>IP / location</Th>
              <Th>Last active</Th>
              <Th>Session</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
                  Loading system accounts from MongoDB Atlas...
                </td>
              </tr>
            ) : visibleUsers.length > 0 ? (
              visibleUsers.map((u) => {
                const isRevoked = revoked.includes(u._id);
                return (
                  <tr key={u._id} className="hairline-b">
                    <Td>
                      <span className="flex items-center gap-3">
                        <Avatar name={u.name} online={!isRevoked} />
                        <span>
                          <span className="block font-medium">{u.name}</span>
                          <span className="mono-label text-muted-foreground">{u._id.slice(-8).toUpperCase()}</span>
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">{u.email}</span>
                    </Td>
                    <Td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="mono-label bg-background border border-border/70 text-xs rounded px-2 py-1 font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="USER">USER</option>
                        <option value="PATIENT">PATIENT</option>
                        <option value="DOCTOR">DOCTOR</option>
                        <option value="RADIOLOGIST">RADIOLOGIST</option>
                        <option value="RECEPTIONIST">RECEPTIONIST</option>
                        <option value="PHARMACIST">PHARMACIST</option>
                        <option value="NURSE">NURSE</option>
                        <option value="EMERGENCY_DOCTOR">EMERGENCY_DOCTOR</option>
                        <option value="LAB_TECHNICIAN">LAB_TECHNICIAN</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <span className="mono-label text-muted-foreground block mt-0.5 text-[10px]">Change Role</span>
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
                      <span className="mono-label text-muted-foreground">Web Session</span>
                    </Td>
                    <Td>
                      <span className="mono-label block">127.0.0.1</span>
                      <span className="mono-label text-muted-foreground">Local / SSL</span>
                    </Td>
                    <Td>
                      <span className="mono-label">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        {isRevoked ? (
                          <Pill tone="mute">revoked</Pill>
                        ) : (
                          <Pill tone="ok">active</Pill>
                        )}
                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => setRevoked((r) => [...r, u._id])}
                            className="mono-label text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                          >
                            <LogOut className="size-3" /> sign out
                          </button>
                        )}
                      </span>
                    </Td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center mono-label text-xs text-muted-foreground">
                  No user accounts registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </div>
  );
}

/* ---------- 04 · Patient registry ---------- */

export function PatientsPanel() {
  const [dbPatients, setDbPatients] = useState<AdminPatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminPatientsApi({ page, limit: 10, q: q || undefined });
      if (res.success && res.patients) {
        setDbPatients(res.patients);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch admin patients", err);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    void Promise.resolve().then(loadPatients);
  }, [loadPatients]);

  useAdminRealtime(["patients", "users"], loadPatients);

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-215">
          <thead className="hairline-b">
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
                <td colSpan={7} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
                  Loading patient registry from MongoDB Atlas...
                </td>
              </tr>
            ) : dbPatients.length > 0 ? (
              dbPatients.map((p) => (
                <tr key={p._id} className="hairline-b">
                  <Td>
                    <span className="mono-label text-muted-foreground">{p._id.slice(-8).toUpperCase()}</span>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={p.user?.name || "Patient"} online={true} />
                      <div>
                        <p className="font-medium text-foreground">{p.user?.name || "Anonymous Patient"}</p>
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
                <td colSpan={7} className="p-8 text-center mono-label text-xs text-muted-foreground">
                  No registered patient profiles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </div>
  );
}

/* ---------- 05 · Theatre schedule ---------- */

export function SchedulePanel() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AdminAppointmentData[]>([]);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminScheduleApi();
      if (res.success && res.appointments) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error("Failed to fetch admin schedule", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadSchedule);
  }, [loadSchedule]);

  useAdminRealtime(["schedule", "appointments"], loadSchedule);

  const scheduleWindow = { from: 7, to: 20 };
  const span = scheduleWindow.to - scheduleWindow.from;
  const hours = Array.from({ length: span + 1 }, (_, i) => scheduleWindow.from + i);

  // Map appointments to rooms (departments or doctors)
  const mappedSchedule = appointments.map((apt) => {
    const [hourStr, minStr] = apt.timeSlot.split(":");
    const startHour = parseInt(hourStr) + parseInt(minStr) / 60;
    return {
      id: apt._id,
      room: apt.doctor?.department || "General",
      label: apt.patient?.user?.name || "Patient",
      surgeon: apt.doctor?.user?.name || "Doctor",
      start: startHour,
      end: startHour + 1, // Assume 1 hr
      state: apt.status === "COMPLETED" ? "in-theatre" : apt.status === "CANCELLED" ? "delayed" : "scheduled",
    };
  });

  const rooms = Array.from(new Set(mappedSchedule.map((s) => s.room)));

  return (
    <div>
      <PanelHeader
        index="05 / scheduling"
        title="Theatre & clinic schedule"
        note="Today's operating list across every room — live cases, delays and the open slots you can still fill."
        actions={
          <>
            <ActionButton>Print list</ActionButton>
            <ActionButton tone="solid">Add case</ActionButton>
          </>
        }
      />
      <div className="overflow-x-auto px-5 py-6 sm:px-8">
        {loading ? (
          <p className="mono-label text-muted-foreground animate-pulse text-center p-8">Loading schedule from database...</p>
        ) : (
          <div className="min-w-205">
            <div className="mono-label text-muted-foreground flex pl-28">
              {hours.map((h) => (
                <span key={h} className="flex-1">
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {rooms.length > 0 ? rooms.map((room) => (
                <div key={room} className="flex items-center">
                  <span className="mono-label w-28 shrink-0">{room}</span>
                  <div className="hairline relative h-11 flex-1 bg-graph-paper">
                    {mappedSchedule
                      .filter((s) => s.room === room)
                      .map((s) => {
                        const left = ((s.start - scheduleWindow.from) / span) * 100;
                        const width = ((s.end - s.start) / span) * 100;
                        const tone =
                          s.state === "in-theatre"
                            ? "bg-accent/25 text-brass border-l-2 border-l-[var(--color-accent)]"
                            : s.state === "delayed"
                              ? "bg-destructive/15 text-destructive border-l-2 border-l-current"
                              : "bg-foreground/[0.06] text-foreground border-l-2 border-l-[var(--hairline)]";
                        return (
                          <motion.div
                            key={s.label + s.start}
                            initial={{ opacity: 0, scaleX: 0.4 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            style={{ left: `${Math.max(0, left)}%`, width: `${width}%`, originX: 0 }}
                            className={`absolute top-1 bottom-1 overflow-hidden px-2 py-1 ${tone}`}
                          >
                            <span className="mono-label block truncate">{s.label}</span>
                            <span className="mono-label text-muted-foreground block truncate">
                              {s.surgeon}
                            </span>
                            {s.state === "in-theatre" && (
                              <motion.span
                                className="bg-accent absolute top-0 right-0 h-full w-0.5"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              )) : (
                <p className="mono-label text-muted-foreground text-center p-8 border border-dashed border-border/60">No appointments scheduled for today.</p>
              )}
            </div>
            <div className="mono-label text-muted-foreground mt-5 flex gap-5">
              <span className="flex items-center gap-2">
                <span className="bg-accent/40 inline-block size-2.5" /> completed/in-session
              </span>
              <span className="flex items-center gap-2">
                <span className="bg-foreground/20 inline-block size-2.5" /> scheduled
              </span>
              <span className="flex items-center gap-2">
                <span className="bg-destructive/40 inline-block size-2.5" /> cancelled/delayed
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 07 · Roles & permissions ---------- */

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
      <PanelHeader
        index="07 / access"
        title="Roles & permissions"
        note="Every scope each role carries. Change it here and it propagates to all seats on the next token refresh."
        actions={<ActionButton tone="solid">New role</ActionButton>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-190">
          <thead className="hairline-b">
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
                <td colSpan={permissionScopes.length + 2} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
                  Loading role seats from database...
                </td>
              </tr>
            ) : roles.length > 0 ? (
              roles.map((r) => (
              <tr key={r.role} className="hairline-b">
                <Td>
                  <span className="font-medium">{r.role}</span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{r.seats}</span>
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
                        <span className="mono-label text-muted-foreground">—</span>
                      )}
                    </Td>
                  );
                })}
              </tr>
              ))
            ) : (
              <tr>
                <td colSpan={permissionScopes.length + 2} className="p-8 text-center mono-label text-xs text-muted-foreground">
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- 11 · Integrations & keys ---------- */

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
