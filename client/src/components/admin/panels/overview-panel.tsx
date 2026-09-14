"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
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
  delay = 0,
}: {
  label: string;
  value: string;
  delta?: string;
  suffix?: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="bg-card/40 border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm group"
    >
      <p className="mono-label text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
        {value}
        {suffix ? <span className="text-muted-foreground text-base font-normal"> {suffix}</span> : null}
      </p>
      {delta ? (
        <p className="mono-label text-brass mt-4 flex items-center gap-1.5 bg-accent/10 w-fit px-2.5 py-1 rounded-md">
          <ArrowUpRight className="size-3.5" />
          {delta}
        </p>
      ) : null}
    </motion.div>
  );
}

function RevenueChart({ invoices }: { invoices: AdminInvoiceData[] }) {
  const revenueData = useMemo(() => {
    const sorted = [...invoices].filter(i => i.status === "PAID").sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const grouped: Record<string, number> = {};
    sorted.forEach(inv => {
      const date = new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      grouped[date] = (grouped[date] || 0) + (inv.totalAmount || 0);
    });
    const data = Object.entries(grouped).map(([date, total]) => ({ date, total }));
    return data.length > 0 ? data : [{ date: "No data", total: 0 }];
  }, [invoices]);

  const max = Math.max(...revenueData.map(d => d.total));

  return (
    <div className="hairline-b px-5 py-6 sm:px-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="mono-label text-muted-foreground">Revenue trends</p>
          <p className="mt-2 font-mono text-2xl font-bold">
            ₹{revenueData[revenueData.length - 1]?.total.toLocaleString()}
            <span className="text-muted-foreground text-sm"> latest period</span>
          </p>
        </div>
        <p className="mono-label text-brass">peak ₹{max.toLocaleString()}</p>
      </div>

      <div className="mt-5 h-40 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--hairline)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} 
              dy={10} 
            />
            <RechartsTooltip
              contentStyle={{ backgroundColor: "color-mix(in oklab, var(--color-background) 80%, transparent)", backdropFilter: "blur(8px)", borderColor: "var(--hairline)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              itemStyle={{ color: "var(--color-foreground)", fontWeight: "bold" }}
              labelStyle={{ color: "var(--color-muted-foreground)", fontSize: "12px", marginBottom: "4px" }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
              cursor={{ stroke: 'var(--hairline)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="var(--color-accent)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OccupancyGauge({ wards }: { wards: AdminWardData[] }) {
  const total = wards.reduce((a, w) => a + (w.capacity || 0), 0);
  const used = wards.reduce((a, w) => a + (w.currentOccupancy || 0), 0);
  const free = Math.max(0, total - used);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  
  const data = [
    { name: "Occupied", value: used },
    { name: "Available", value: free },
  ];
  
  const COLORS = ["var(--color-accent)", "var(--hairline)"];

  return (
    <div className="hairline-l flex items-center gap-6 px-5 py-6">
      <div className="size-28 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={36}
              outerRadius={52}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ backgroundColor: "color-mix(in oklab, var(--color-background) 80%, transparent)", backdropFilter: "blur(8px)", borderColor: "var(--hairline)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              itemStyle={{ color: "var(--color-foreground)", fontWeight: "bold", fontSize: "14px" }}
              labelStyle={{ display: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold -mb-1">Used</p>
          <p className="text-xl font-mono font-bold text-foreground">{pct}%</p>
        </div>
      </div>
      <div>
        <p className="mono-label text-muted-foreground">Bed occupancy</p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{used} <span className="text-muted-foreground text-base font-normal">/ {total}</span></p>
        <p className="mono-label text-muted-foreground mt-2">
          active patients in wards
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-5 py-6 sm:px-8">
        <Metric label="Registered users" value={stats ? String(stats.totalUsers) : "..."} delta="MongoDB Atlas live" delay={0.1} />
        <Metric label="Active patients" value={stats ? String(stats.totalPatients) : "..."} delta="Health profiles complete" delay={0.2} />
        <Metric label="Approved clinicians" value={stats ? String(stats.totalClinicians) : "..."} delta="Doctors & Radiologists" delay={0.3} />
        <Metric label="Total appointments" value={stats ? String(stats.totalAppointments) : "..."} delta="Booked consultations" delay={0.4} />
      </div>

      <div className="hairline-b grid lg:grid-cols-[1.6fr_1fr]">
        <RevenueChart invoices={invoices} />
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
