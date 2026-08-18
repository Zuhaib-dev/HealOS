import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { ActionButton, PanelHeader } from "../admin-shell";
import {
  AdminAuditLogData,
  AdminInventoryData,
  AdminInvoiceData,
  AdminStaffData,
  AdminWardData,
  FacilityStatsData,
  fetchAdminAuditLogsApi,
  fetchAdminInventoryApi,
  fetchAdminInvoicesApi,
  fetchAdminStaffApi,
  fetchAdminWardsApi,
  fetchFacilityStatsApi,
} from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

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

function Throughput({ values }: { values: number[] }) {
  const safeValues = values.length > 0 ? values : [0];
  const max = Math.max(...safeValues, 1);
  const denominator = Math.max(safeValues.length - 1, 1);
  const points = safeValues.map((v, i) => `${(i / denominator) * 100},${40 - (v / max) * 34}`).join(" ");

  return (
    <div className="hairline-b px-5 py-6 sm:px-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="mono-label text-muted-foreground">Facility activity snapshot</p>
          <p className="mt-2 font-mono text-2xl font-bold">
            {safeValues[safeValues.length - 1]}
            <span className="text-muted-foreground text-sm"> pending approvals</span>
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
        {safeValues.map((v, i) => (
          <motion.circle
            key={i}
            cx={(i / denominator) * 100}
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

function OccupancyGauge({ wards }: { wards: AdminWardData[] }) {
  const total = wards.reduce((a, w) => a + (w.capacity || 0), 0);
  const used = wards.reduce((a, w) => a + (w.currentOccupancy || 0), 0);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
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

export function OverviewPanel() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<FacilityStatsData | null>(null);
  const [wards, setWards] = useState<AdminWardData[]>([]);
  const [staff, setStaff] = useState<AdminStaffData[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoiceData[]>([]);
  const [inventory, setInventory] = useState<AdminInventoryData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogData[]>([]);

  const loadOverview = useCallback(async () => {
    try {
      const [statsRes, wardsRes, staffRes, invoicesRes, inventoryRes, auditRes] = await Promise.all([
        fetchFacilityStatsApi(),
        fetchAdminWardsApi(),
        fetchAdminStaffApi(),
        fetchAdminInvoicesApi(),
        fetchAdminInventoryApi(),
        fetchAdminAuditLogsApi(),
      ]);

      if (statsRes.success && statsRes.stats) setStats(statsRes.stats);
      if (wardsRes.success && wardsRes.wards) setWards(wardsRes.wards);
      if (staffRes.success && staffRes.staff) setStaff(staffRes.staff);
      if (invoicesRes.success && invoicesRes.invoices) setInvoices(invoicesRes.invoices);
      if (inventoryRes.success && inventoryRes.inventory) setInventory(inventoryRes.inventory);
      if (auditRes.success && auditRes.logs) setAuditLogs(auditRes.logs);
    } catch (err) {
      console.error("Failed to load facility overview", err);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadOverview);
  }, [loadOverview]);

  useAdminRealtime(["users", "patients", "staff", "roles", "wards", "billing", "inventory", "audit", "approvals"], loadOverview);

  const overdueInvoices = invoices.filter((invoice) => invoice.status === "OVERDUE" || invoice.status === "FAILED");
  const lowStock = inventory.filter((item) => item.currentStock < item.reorderThreshold);
  const criticalAudit = auditLogs.filter((log) => log.level === "crit");
  const departmentLoad = Object.values(
    staff.reduce<Record<string, { label: string; total: number; approved: number }>>((acc, member) => {
      const label = member.department || "General";
      acc[label] ||= { label, total: 0, approved: 0 };
      acc[label].total += 1;
      if (member.status === "APPROVED") acc[label].approved += 1;
      return acc;
    }, {})
  ).map((dept) => ({
    label: dept.label,
    value: dept.total > 0 ? Math.round((dept.approved / dept.total) * 100) : 0,
  }));
  const throughputValues = [
    stats?.totalUsers || 0,
    stats?.totalPatients || 0,
    stats?.totalClinicians || 0,
    stats?.totalAppointments || 0,
    stats?.pendingApprovals || 0,
  ];

  return (
    <section>
      <PanelHeader
        index="01 / OVERVIEW"
        title={`Facility command - ${user?.name || "Superadmin"}`}
        note={`Role: ${user?.role || "ADMIN"} · System Administrator: ${user?.email || "N/A"}`}
        actions={<ActionButton onClick={loadOverview}>Refresh live data</ActionButton>}
      />

      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Registered users" value={stats ? String(stats.totalUsers) : "..."} delta="MongoDB Atlas live" />
        <Metric label="Active patients" value={stats ? String(stats.totalPatients) : "..."} delta="Health profiles complete" />
        <Metric label="Approved clinicians" value={stats ? String(stats.totalClinicians) : "..."} delta="Doctors & Radiologists" />
        <Metric label="Total appointments" value={stats ? String(stats.totalAppointments) : "..."} delta="Booked consultations" />
      </div>

      <div className="hairline-b grid lg:grid-cols-[1.6fr_1fr]">
        <Throughput values={throughputValues} />
        <OccupancyGauge wards={wards} />
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="hairline-b px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Queue requiring you</p>
          <ul className="mt-4 space-y-3">
            {[
              [`${stats?.pendingApprovals || 0} clinician credentials`, "awaiting verification"],
              [`${overdueInvoices.length} invoice alerts`, "failed or overdue"],
              [`${criticalAudit.length} security incidents`, "critical audit level"],
              [`${lowStock.length} supplies below reorder`, "inventory threshold"],
            ].map(([a, b]) => (
              <li key={a} className="hairline-b flex items-center justify-between gap-4 pb-3">
                <span className="text-sm">{a}</span>
                <span className="mono-label text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hairline-b hairline-l px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Department approval index</p>
          <div className="mt-5 space-y-4">
            {departmentLoad.length > 0 ? (
              departmentLoad.map(({ label, value }) => (
                <div key={label}>
                  <div className="mono-label flex justify-between">
                    <span>{label}</span>
                    <span className="text-brass">{value}</span>
                  </div>
                  <div className="bg-foreground/[0.07] mt-2 h-1.5">
                    <motion.div
                      className="bg-accent h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="mono-label text-muted-foreground">No staff departments registered.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
