import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { LogOut, KeyRound, ShieldCheck, ShieldOff, Copy, Plus } from "lucide-react";
import { ActionButton, PanelHeader } from "./admin-shell";
import {
  users,
  patients,
  schedule,
  scheduleWindow,
  roleMatrix,
  permissionScopes,
  integrations,
  apiKeys,
} from "./admin-data-people";

/* ---------- local primitives ---------- */

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
  const [filter, setFilter] = useState<"all" | "online" | "no-mfa">("all");
  const [revoked, setRevoked] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      users.filter((u) =>
        filter === "online" ? u.online : filter === "no-mfa" ? !u.mfa : true,
      ),
    [filter],
  );

  const online = users.filter((u) => u.online).length;
  const noMfa = users.filter((u) => !u.mfa).length;

  return (
    <div>
      <PanelHeader
        index="03 / identity"
        title="Users & sessions"
        note="Everyone signed in right now — account, device, network and how long since they last touched a record."
        actions={
          <>
            <ActionButton>Invite user</ActionButton>
            <ActionButton tone="solid">Force global sign-out</ActionButton>
          </>
        }
      />

      <div className="hairline-b grid grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Accounts", value: String(users.length) },
          { label: "Signed in now", value: String(online) },
          { label: "Without 2FA", value: String(noMfa) },
          { label: "Sessions revoked", value: String(revoked.length) },
        ].map((m) => (
          <div key={m.label} className="hairline-l px-5 py-4">
            <p className="mono-label text-muted-foreground">{m.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="hairline-b flex gap-1 px-5 py-3 sm:px-8">
        {(
          [
            ["all", "All users"],
            ["online", "Online"],
            ["no-mfa", "2FA missing"],
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
        <table className="w-full min-w-[1000px]">
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
            {rows.map((u) => {
              const isRevoked = revoked.includes(u.id);
              return (
                <motion.tr
                  key={u.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isRevoked ? 0.45 : 1 }}
                  className="hairline-b"
                >
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} online={u.online && !isRevoked} />
                      <span>
                        <span className="block font-medium">{u.name}</span>
                        <span className="mono-label text-muted-foreground">{u.id}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{u.email}</span>
                  </Td>
                  <Td>
                    <span className="block">{u.role}</span>
                    <span className="mono-label text-muted-foreground">{u.dept}</span>
                  </Td>
                  <Td>
                    {u.mfa ? (
                      <span className="text-brass flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5" />
                        <span className="mono-label">on</span>
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1.5">
                        <ShieldOff className="size-3.5" />
                        <span className="mono-label">off</span>
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{u.device}</span>
                  </Td>
                  <Td>
                    <span className="mono-label block">{u.ip}</span>
                    <span className="mono-label text-muted-foreground">{u.location}</span>
                  </Td>
                  <Td>
                    <span className="mono-label">{u.lastActive}</span>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      {isRevoked ? (
                        <Pill tone="mute">revoked</Pill>
                      ) : u.session === "active" ? (
                        <Pill tone="ok">active</Pill>
                      ) : u.session === "idle" ? (
                        <Pill tone="warn">idle</Pill>
                      ) : (
                        <Pill tone="bad">expired</Pill>
                      )}
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => setRevoked((r) => [...r, u.id])}
                          className="mono-label text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                        >
                          <LogOut className="size-3" /> sign out
                        </button>
                      )}
                    </span>
                  </Td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- 04 · Patient registry ---------- */

export function PatientsPanel() {
  const [q, setQ] = useState("");
  const rows = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.mrn.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PanelHeader
        index="04 / registry"
        title="Patient registry"
        note="Admitted census with acuity, attending clinician and safety flags surfaced before you open a chart."
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
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name or MRN"
          className="mono-label hairline placeholder:text-muted-foreground w-full max-w-xs bg-transparent px-3 py-2 outline-none"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="hairline-b">
            <tr>
              <Th>MRN</Th>
              <Th>Patient</Th>
              <Th>Age / sex</Th>
              <Th>Ward</Th>
              <Th>Attending</Th>
              <Th>Admitted</Th>
              <Th>Acuity</Th>
              <Th>Flags</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.mrn} className="hairline-b">
                <Td>
                  <span className="mono-label">{p.mrn}</span>
                </Td>
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={p.name} online={p.acuity === "critical"} />
                    <span className="font-medium">{p.name}</span>
                  </span>
                </Td>
                <Td>
                  <span className="mono-label">
                    {p.age} · {p.sex}
                  </span>
                </Td>
                <Td>
                  <span className="mono-label">{p.ward}</span>
                </Td>
                <Td>{p.attending}</Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{p.admitted}</span>
                </Td>
                <Td>
                  {p.acuity === "critical" ? (
                    <Pill tone="bad">critical</Pill>
                  ) : p.acuity === "guarded" ? (
                    <Pill tone="warn">guarded</Pill>
                  ) : (
                    <Pill tone="ok">stable</Pill>
                  )}
                </Td>
                <Td>
                  {p.flag ? (
                    <span className="mono-label text-brass">{p.flag}</span>
                  ) : (
                    <span className="mono-label text-muted-foreground">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- 05 · Theatre schedule ---------- */

export function SchedulePanel() {
  const rooms = Array.from(new Set(schedule.map((s) => s.room)));
  const span = scheduleWindow.to - scheduleWindow.from;
  const hours = Array.from({ length: span + 1 }, (_, i) => scheduleWindow.from + i);

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
        <div className="min-w-[820px]">
          <div className="mono-label text-muted-foreground flex pl-28">
            {hours.map((h) => (
              <span key={h} className="flex-1">
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {rooms.map((room) => (
              <div key={room} className="flex items-center">
                <span className="mono-label w-28 shrink-0">{room}</span>
                <div className="hairline relative h-11 flex-1 bg-graph-paper">
                  {schedule
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
                          style={{ left: `${left}%`, width: `${width}%`, originX: 0 }}
                          className={`absolute top-1 bottom-1 overflow-hidden px-2 py-1 ${tone}`}
                        >
                          <span className="mono-label block truncate">{s.label}</span>
                          <span className="mono-label text-muted-foreground block truncate">
                            {s.surgeon}
                          </span>
                          {s.state === "in-theatre" && (
                            <motion.span
                              className="bg-accent absolute top-0 right-0 h-full w-[2px]"
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
          <div className="mono-label text-muted-foreground mt-5 flex gap-5">
            <span className="flex items-center gap-2">
              <span className="bg-accent/40 inline-block size-2.5" /> in theatre
            </span>
            <span className="flex items-center gap-2">
              <span className="bg-foreground/20 inline-block size-2.5" /> scheduled
            </span>
            <span className="flex items-center gap-2">
              <span className="bg-destructive/40 inline-block size-2.5" /> delayed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 07 · Roles & permissions ---------- */

export function RolesPanel() {
  return (
    <div>
      <PanelHeader
        index="07 / access"
        title="Roles & permissions"
        note="Every scope each role carries. Change it here and it propagates to all seats on the next token refresh."
        actions={<ActionButton tone="solid">New role</ActionButton>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
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
            {roleMatrix.map((r) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- 11 · Integrations & keys ---------- */

export function IntegrationsPanel() {
  const [copied, setCopied] = useState<string | null>(null);

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
        {integrations.map((i) => (
          <div key={i.name} className="hairline-l hairline-b px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-base font-bold">{i.name}</p>
                <p className="mono-label text-muted-foreground mt-1">{i.kind}</p>
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
        ))}
      </div>

      <div className="px-5 py-6 sm:px-8">
        <p className="mono-label text-muted-foreground flex items-center gap-2">
          <KeyRound className="size-3.5" /> Service API keys
        </p>
        <div className="hairline mt-3">
          {apiKeys.map((k) => (
            <div
              key={k.prefix}
              className="hairline-b flex flex-wrap items-center gap-4 px-4 py-3.5 last:border-b-0"
            >
              <span className="w-44 font-medium">{k.label}</span>
              <span className="mono-label text-brass">{k.prefix}••••••••</span>
              <span className="mono-label text-muted-foreground">{k.scope}</span>
              <span className="mono-label text-muted-foreground ml-auto">used {k.lastUsed}</span>
              <button
                type="button"
                onClick={() => setCopied(k.prefix)}
                className="mono-label text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Copy className="size-3" /> {copied === k.prefix ? "copied" : "copy"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
