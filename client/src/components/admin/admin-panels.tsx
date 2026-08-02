import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Check, X, TriangleAlert } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  approvals,
  staff,
  wards,
  audit,
  invoices,
  supplies,
  throughput,
} from "./admin-data";
import { ActionButton, PanelHeader } from "./admin-shell";

/* ---------- shared primitives ---------- */

function Metric({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: string;
  delta?: string;
  suffix?: string;
}) {
  return (
    <div className="hairline-l px-5 py-5">
      <p className="mono-label text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
        {value}
        {suffix ? <span className="text-muted-foreground text-base"> {suffix}</span> : null}
      </p>
      {delta ? (
        <p className="mono-label text-brass mt-2 flex items-center gap-1">
          <ArrowUpRight className="size-3" />
          {delta}
        </p>
      ) : null}
    </div>
  );
}

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
      <table className="w-full min-w-[720px] border-collapse">{children}</table>
    </div>
  );
}

/* ---------- 01 overview ---------- */

function Throughput() {
  const max = Math.max(...throughput);
  const points = throughput
    .map((v, i) => `${(i / (throughput.length - 1)) * 100},${40 - (v / max) * 34}`)
    .join(" ");

  return (
    <div className="hairline-b px-5 py-6 sm:px-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="mono-label text-muted-foreground">Admissions throughput / 14 days</p>
          <p className="mt-2 font-mono text-2xl font-bold">
            {throughput[throughput.length - 1]}
            <span className="text-muted-foreground text-sm"> today</span>
          </p>
        </div>
        <p className="mono-label text-brass">peak {max}</p>
      </div>

      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-5 h-32 w-full">
        {[10, 20, 30].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--hairline)" strokeWidth="0.2" />
        ))}
        <motion.polyline
          points={`0,40 ${points} 100,40`}
          fill="color-mix(in oklab, var(--color-accent) 12%, transparent)"
          stroke="none"
        />
        <motion.polyline
          points={points}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        {throughput.map((v, i) => (
          <motion.circle
            key={i}
            cx={(i / (throughput.length - 1)) * 100}
            cy={40 - (v / max) * 34}
            r="0.6"
            fill="var(--color-accent)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.4, delay: i * 0.12, repeat: Infinity }}
          />
        ))}
      </svg>
    </div>
  );
}

function OccupancyGauge() {
  const total = wards.reduce((a, w) => a + w.total, 0);
  const used = wards.reduce((a, w) => a + w.used, 0);
  const pct = Math.round((used / total) * 100);
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <div className="hairline-l flex items-center gap-6 px-5 py-6">
      <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--hairline)" strokeWidth="6" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div>
        <p className="mono-label text-muted-foreground">Bed occupancy</p>
        <p className="mt-2 font-mono text-3xl font-bold">{pct}%</p>
        <p className="mono-label text-muted-foreground mt-2">
          {used} of {total} beds in service
        </p>
      </div>
    </div>
  );
}

import { fetchFacilityStatsApi, FacilityStatsData } from "@/lib/api/admin";

export function OverviewPanel() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<FacilityStatsData | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetchFacilityStatsApi();
        if (res.success && res.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error("Failed to load facility stats", err);
      }
    };
    loadStats();
  }, []);

  return (
    <section>
      <PanelHeader
        index="01 / OVERVIEW"
        title={`Facility command — ${user?.name || "Superadmin"}`}
        note={`Role: ${user?.role || "ADMIN"} · System Administrator: ${user?.email || "N/A"}`}
        actions={
          <>
            <ActionButton>Export shift report</ActionButton>
            <ActionButton tone="solid">Broadcast notice</ActionButton>
          </>
        }
      />

      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Registered users" value={stats ? String(stats.totalUsers) : "..."} delta="MongoDB Atlas live" />
        <Metric label="Active patients" value={stats ? String(stats.totalPatients) : "..."} delta="Health profiles complete" />
        <Metric label="Approved clinicians" value={stats ? String(stats.totalClinicians) : "..."} delta="Doctors & Radiologists" />
        <Metric label="Total appointments" value={stats ? String(stats.totalAppointments) : "..."} delta="Booked consultations" />
      </div>

      <div className="hairline-b grid lg:grid-cols-[1.6fr_1fr]">
        <Throughput />
        <OccupancyGauge />
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="hairline-b px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Queue requiring you</p>
          <ul className="mt-4 space-y-3">
            {[
              ["4 clinician credentials", "awaiting verification"],
              ["2 disputed invoices", "over $10k exposure"],
              ["1 security incident", "IP blocked at 06:33"],
              ["3 supplies below reorder", "pharmacy + blood bank"],
            ].map(([a, b]) => (
              <li key={a} className="hairline-b flex items-center justify-between pb-3">
                <span className="text-sm">{a}</span>
                <span className="mono-label text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hairline-b hairline-l px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Department load index</p>
          <div className="mt-5 space-y-4">
            {[
              ["Emergency", 92],
              ["Critical care", 87],
              ["Surgery", 74],
              ["Radiology", 61],
              ["Maternity", 48],
            ].map(([label, v]) => (
              <div key={label as string}>
                <div className="mono-label flex justify-between">
                  <span>{label}</span>
                  <span className="text-brass">{v}</span>
                </div>
                <div className="bg-foreground/[0.07] mt-2 h-1.5">
                  <motion.div
                    className="bg-accent h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${v as number}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import {
  fetchPendingOnboardingRequestsApi,
  approveOnboardingRequestApi,
  rejectOnboardingRequestApi,
  ProfessionalProfileData,
} from "@/lib/api/onboarding";
import { toast } from "sonner";

/* ---------- 02 approvals ---------- */

export function ApprovalsPanel() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ProfessionalProfileData[]>([]);
  const [decided, setDecided] = useState<Record<string, "approved" | "rejected">>({});
  const [actionId, setActionId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetchPendingOnboardingRequestsApi();
      if (res.success && res.profiles) {
        setRequests(res.profiles);
      }
    } catch (err) {
      console.error("Failed to load pending onboarding requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      const res = await approveOnboardingRequestApi(id);
      if (res.success) {
        toast.success(res.message || "Clinician request approved! Role upgraded.");
        setDecided((prev) => ({ ...prev, [id]: "approved" }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve request");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Enter rejection reason for this applicant:");
    if (!reason || reason.trim().length < 5) {
      toast.error("Please enter a valid rejection reason (at least 5 characters).");
      return;
    }

    try {
      setActionId(id);
      const res = await rejectOnboardingRequestApi(id, reason);
      if (res.success) {
        toast.success("Application rejected with reason");
        setDecided((prev) => ({ ...prev, [id]: "rejected" }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject request");
    } finally {
      setActionId(null);
    }
  };

  return (
    <section>
      <PanelHeader
        index="02 / APPROVALS"
        title="Credential queue"
        note="Verify licences and grant scoped access before a clinician touches a record."
        actions={<ActionButton>Verification policy</ActionButton>}
      />
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Request</Th>
            <Th>Applicant</Th>
            <Th>Licence</Th>
            <Th>Submitted</Th>
            <Th>Decision</Th>
          </tr>
        </thead>
        <tbody>
          {requests.length > 0
            ? requests.map((reqItem) => {
                const userObj = typeof reqItem.user === "object" ? reqItem.user : null;
                const applicantName = userObj?.name || "Applicant";
                const applicantEmail = userObj?.email || "";
                const d = decided[reqItem._id];
                const isBusy = actionId === reqItem._id;

                return (
                  <tr key={reqItem._id} className="hairline-b">
                    <Td>
                      <span className="mono-label text-muted-foreground">{reqItem._id.slice(-6).toUpperCase()}</span>
                    </Td>
                    <Td>
                      <p className="font-medium text-foreground">{applicantName}</p>
                      <p className="mono-label text-muted-foreground">{reqItem.requestedRole} · {reqItem.degree}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{applicantEmail}</p>
                    </Td>
                    <Td>
                      <span className="mono-label font-bold text-primary">{reqItem.licenseNumber}</span>
                      <p className="text-[11px] text-muted-foreground">{reqItem.specialization} ({reqItem.experienceYears}y exp)</p>
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">{new Date(reqItem.createdAt).toLocaleDateString()}</span>
                    </Td>
                    <Td>
                      {d ? (
                        <Pill tone={d === "approved" ? "ok" : "bad"}>{d}</Pill>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApprove(reqItem._id)}
                            className="hairline mono-label bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-1.5 hover:opacity-75 cursor-pointer rounded"
                          >
                            <Check className="size-3" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleReject(reqItem._id)}
                            className="hairline mono-label text-destructive bg-destructive/10 border-destructive/30 flex items-center gap-1.5 px-2.5 py-1.5 hover:opacity-75 cursor-pointer rounded"
                          >
                            <X className="size-3" /> Reject
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })
            : approvals.map((a) => {
                const d = decided[a.id];
                return (
                  <tr key={a.id} className="hairline-b">
                    <Td>
                      <span className="mono-label text-muted-foreground">{a.id}</span>
                    </Td>
                    <Td>
                      <p className="font-medium">{a.name}</p>
                      <p className="mono-label text-muted-foreground">{a.role}</p>
                    </Td>
                    <Td>
                      <span className="mono-label">{a.license}</span>
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">{a.submitted}</span>
                    </Td>
                    <Td>
                      {d ? (
                        <Pill tone={d === "approved" ? "ok" : "bad"}>{d}</Pill>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDecided((p) => ({ ...p, [a.id]: "approved" }))}
                            className="hairline mono-label flex items-center gap-1.5 px-2.5 py-1.5 hover:opacity-75"
                          >
                            <Check className="size-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setDecided((p) => ({ ...p, [a.id]: "rejected" }))}
                            className="hairline mono-label text-muted-foreground flex items-center gap-1.5 px-2.5 py-1.5 hover:opacity-75"
                          >
                            <X className="size-3" /> Reject
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
        </tbody>
      </TablePanel>
    </section>
  );
}

/* ---------- 03 staff ---------- */

export function StaffPanel() {
  const [filter, setFilter] = useState("All");
  const depts = useMemo(() => ["All", ...new Set(staff.map((s) => s.dept))], []);
  const rows = filter === "All" ? staff : staff.filter((s) => s.dept === filter);

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
            <Th>Access scope</Th>
            <Th>State</Th>
            <Th>Load</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="hairline-b">
              <Td>
                <span className="mono-label text-muted-foreground">{s.id}</span>
              </Td>
              <Td>
                <p className="font-medium">{s.name}</p>
                <p className="mono-label text-muted-foreground">
                  {s.role} · {s.dept}
                </p>
              </Td>
              <Td>
                <Pill tone={s.access === "Full" ? "ok" : "warn"}>{s.access}</Pill>
              </Td>
              <Td>
                <Pill
                  tone={s.state === "Active" ? "ok" : s.state === "Suspended" ? "bad" : "mute"}
                >
                  {s.state}
                </Pill>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="bg-foreground/[0.07] h-1.5 w-24">
                    <motion.div
                      className="bg-accent h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${s.load}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="mono-label text-muted-foreground">{s.load}%</span>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TablePanel>
    </section>
  );
}

/* ---------- 04 wards ---------- */

export function WardsPanel() {
  return (
    <section>
      <PanelHeader
        index="04 / CAPACITY"
        title="Wards & bed board"
        note="Every bay, its occupancy and headroom — refreshed as porters move patients."
        actions={<ActionButton>Open bed board</ActionButton>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        {wards.map((w) => {
          const pct = Math.round((w.used / w.total) * 100);
          const tight = pct >= 85;
          return (
            <div key={w.code} className="hairline-b hairline-l px-5 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-lg font-bold">{w.name}</p>
                  <p className="mono-label text-muted-foreground mt-1">{w.code}</p>
                </div>
                <Pill tone={tight ? "bad" : "ok"}>{tight ? "tight" : "ok"}</Pill>
              </div>
              <div className="mt-5 grid grid-cols-8 gap-1">
                {Array.from({ length: w.total }).slice(0, 24).map((_, i) => (
                  <motion.span
                    key={i}
                    className={`h-3 ${i < Math.min(w.used, 24) ? "bg-accent" : "bg-foreground/[0.08]"}`}
                    initial={{ opacity: 0.2 }}
                    animate={{ opacity: i < Math.min(w.used, 24) ? [0.55, 1, 0.55] : 0.5 }}
                    transition={{ duration: 3, delay: i * 0.05, repeat: Infinity }}
                  />
                ))}
              </div>
              <p className="mono-label text-muted-foreground mt-4">
                {w.used}/{w.total} occupied · {w.total - w.used} free
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 05 billing ---------- */

export function BillingPanel() {
  const outstanding = invoices
    .filter((i) => i.state !== "Paid")
    .reduce((a, i) => a + i.amount, 0);

  return (
    <section>
      <PanelHeader
        index="05 / REVENUE"
        title="Revenue ledger"
        note="Claims, payer mix and disputes with the exposure each one carries."
        actions={
          <>
            <ActionButton>Export ledger</ActionButton>
            <ActionButton tone="solid">Raise invoice</ActionButton>
          </>
        }
      />
      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Collected MTD" value="$4.71M" delta="+8.9%" />
        <Metric label="Outstanding" value={`$${(outstanding / 1000).toFixed(1)}k`} />
        <Metric label="Denial rate" value="2.4" suffix="%" />
        <Metric label="Days in A/R" value="31" suffix="days" />
      </div>
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Invoice</Th>
            <Th>Patient</Th>
            <Th>Payer</Th>
            <Th>Amount</Th>
            <Th>State</Th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="hairline-b">
              <Td>
                <span className="mono-label">{i.id}</span>
              </Td>
              <Td>
                <span className="mono-label text-muted-foreground">{i.patient}</span>
              </Td>
              <Td>{i.payer}</Td>
              <Td>
                <span className="font-mono font-bold">${i.amount.toLocaleString()}</span>
              </Td>
              <Td>
                <Pill tone={i.state === "Paid" ? "ok" : i.state === "Disputed" ? "bad" : "warn"}>
                  {i.state}
                </Pill>
              </Td>
            </tr>
          ))}
        </tbody>
      </TablePanel>
    </section>
  );
}

/* ---------- 06 supplies ---------- */

export function SuppliesPanel() {
  return (
    <section>
      <PanelHeader
        index="06 / SUPPLY"
        title="Pharmacy & stores"
        note="Consumption against reorder thresholds for controlled and critical stock."
        actions={<ActionButton tone="solid">Create purchase order</ActionButton>}
      />
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Item</Th>
            <Th>Code</Th>
            <Th>On hand</Th>
            <Th>Reorder at</Th>
            <Th>Signal</Th>
          </tr>
        </thead>
        <tbody>
          {supplies.map((s) => {
            const low = s.stock < s.reorder;
            return (
              <tr key={s.code} className="hairline-b">
                <Td>
                  <span className="font-medium">{s.item}</span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{s.code}</span>
                </Td>
                <Td>
                  <span className="font-mono font-bold">{s.stock}</span>{" "}
                  <span className="mono-label text-muted-foreground">{s.unit}</span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">
                    {s.reorder} {s.unit}
                  </span>
                </Td>
                <Td>
                  {low ? (
                    <span className="mono-label text-destructive flex items-center gap-1.5">
                      <TriangleAlert className="size-3" /> reorder now
                    </span>
                  ) : (
                    <Pill tone="ok">healthy</Pill>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TablePanel>
    </section>
  );
}

/* ---------- 07 audit ---------- */

export function AuditPanel() {
  return (
    <section>
      <PanelHeader
        index="07 / AUDIT"
        title="Audit trail & security"
        note="Every privileged action, immutable and timestamped for compliance review."
        actions={<ActionButton>Download 30-day log</ActionButton>}
      />
      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Events today" value="1,284" />
        <Metric label="Privileged actions" value="37" />
        <Metric label="Blocked attempts" value="5" />
        <Metric label="Open incidents" value="1" />
      </div>
      <ol className="px-5 py-6 sm:px-8">
        {audit.map((e) => (
          <li key={e.at} className="hairline-b flex flex-wrap items-center gap-4 py-4">
            <span className="mono-label text-muted-foreground w-20">{e.at}</span>
            <span
              className={`size-1.5 rounded-full ${
                e.level === "crit"
                  ? "bg-destructive animate-pulse"
                  : e.level === "warn"
                    ? "bg-accent"
                    : "bg-muted-foreground/50"
              }`}
            />
            <span className="min-w-0 flex-1 text-sm">{e.action}</span>
            <span className="mono-label text-muted-foreground">{e.actor}</span>
            <span className="mono-label">{e.target}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- 08 settings ---------- */

function Toggle({ label, note, initial }: { label: string; note: string; initial?: boolean }) {
  const [on, setOn] = useState(!!initial);
  return (
    <div className="hairline-b flex items-center justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground mt-1 text-xs">{note}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        aria-label={label}
        className={`hairline relative h-6 w-11 shrink-0 transition-colors ${on ? "bg-accent/25" : ""}`}
      >
        <motion.span
          className={`absolute top-[3px] size-4 ${on ? "bg-accent" : "bg-muted-foreground/60"}`}
          animate={{ left: on ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        />
      </button>
    </div>
  );
}

export function SettingsPanel() {
  return (
    <section>
      <PanelHeader
        index="08 / CONFIG"
        title="Facility settings"
        note="Governance switches that apply hospital-wide the moment they are changed."
        actions={<ActionButton tone="solid">Save changes</ActionButton>}
      />
      <div className="grid lg:grid-cols-2">
        <div className="hairline-b px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Access & safety</p>
          <div className="mt-3">
            <Toggle label="Enforce 2FA for clinical roles" note="Blocks record access without a second factor." initial />
            <Toggle label="Break-glass emergency access" note="Allows override with mandatory post-hoc review." initial />
            <Toggle label="Auto-suspend dormant accounts" note="Deactivates accounts idle for 45 days." />
            <Toggle label="Restrict exports to on-site network" note="Blocks bulk export from outside the facility." initial />
          </div>
        </div>
        <div className="hairline-b hairline-l px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Facility profile</p>
          <div className="mt-4 space-y-4">
            {[
              ["Facility name", "St. Meridian General"],
              ["Licence number", "HF-2026-8841"],
              ["Timezone", "UTC+00:00"],
              ["Escalation contact", "ops@meridian.health"],
            ].map(([label, value]) => (
              <label key={label} className="block">
                <span className="mono-label text-muted-foreground">{label}</span>
                <input
                  defaultValue={value}
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--hairline-strong)]"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
