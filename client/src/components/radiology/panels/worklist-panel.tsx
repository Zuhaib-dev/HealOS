"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  UploadCloud,
  FileText,
  X,
  Check,
  TriangleAlert,
  PhoneCall,
  Download,
  Share2,
  Trash2,
  Eye,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import { fetchPendingOrdersApi, updateOrderStatusApi, fetchStatsApi, DiagnosticOrderRecord } from "@/lib/api/radiology";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

/* ---------- primitives ---------- */

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "warn" | "bad" | "ok" | "mute";
}) {
  const bg =
    tone === "bad" ? "bg-destructive/15 text-destructive" :
    tone === "warn" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
    tone === "ok" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
    tone === "info" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
    "bg-foreground/5 text-muted-foreground";

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${bg}`}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
  );
}

function Td({ children, colSpan, className }: { children?: React.ReactNode, colSpan?: number, className?: string }) {
  return <td colSpan={colSpan} className={`px-4 py-3.5 align-middle text-sm ${className || ""}`}>{children}</td>;
}

function priorityTone(p: DiagnosticOrderRecord["priority"]) {
  return p === "STAT" ? "bad" : p === "URGENT" ? "warn" : "mute";
}

/** Animated scanner glyph — hand-drawn SVG, no raster assets. */
function ScannerGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full">
      <rect
        x="8"
        y="12"
        width="104"
        height="48"
        fill="none"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      <circle cx="60" cy="36" r="17" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="36" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.8" />
      {active && (
        <motion.line
          x1="8"
          x2="112"
          y1="14"
          y2="14"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          animate={{ y1: [14, 58, 14], y2: [14, 58, 14] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}

/* ---------- 01 worklist ---------- */

export function WorklistPanel() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<"all" | "stat" | "unreported">("all");
  const [orders, setOrders] = useState<DiagnosticOrderRecord[]>([]);
  const [stats, setStats] = useState<{ label: string, value: string, note: string }[]>([]);

  const loadData = async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetchPendingOrdersApi(),
        fetchStatsApi()
      ]);
      if (ordersRes.status === "success") setOrders(ordersRes.data.orders);
      if (statsRes.status === "success") setStats(statsRes.data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "IN_PROGRESS" | "REPORTED" | "CANCELLED") => {
    try {
      const res = await updateOrderStatusApi(id, newStatus);
      if (res.status === "success") {
        toast.success(`Order status updated to ${newStatus}`);
        loadData();
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("reportFile", file);
    formData.append("comments", "Uploaded inline from worklist");
    
    try {
      toast.info("Uploading report...");
      const { uploadDiagnosticReportApi } = await import("@/lib/api/radiology");
      const res = await uploadDiagnosticReportApi(id, formData);
      if (res.status === "success") {
        toast.success("Report uploaded successfully");
        loadData();
      }
    } catch (error) {
      toast.error("Failed to upload report");
    }
  };

  const rows = orders.filter((w) =>
    filter === "all"
      ? true
      : filter === "stat"
        ? w.priority === "STAT"
        : w.status !== "REPORTED",
  );

  return (
    <section>
      <PanelHeader
        index="01 / worklist"
        title={`Modality Worklist — Dr. ${user?.name || "Radiologist"}`}
        note={`Duty Specialist: ${user?.role || "RADIOLOGIST"} · PACS Server: ${user?.email || "Connected"}`}
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All ({orders.length})</ActionButton>
            <ActionButton onClick={() => setFilter("stat")}>Stat</ActionButton>
            <ActionButton tone="solid" onClick={() => setFilter("unreported")}>
              Unreported
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--hairline)" }}>
        {stats.length === 0 ? (
          <div className="col-span-full bg-background p-5 text-center text-muted-foreground">Loading stats...</div>
        ) : stats.map((s) => (
          <div key={s.label} className="bg-background p-5">
            <p className="mono-label text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="mono-label text-muted-foreground mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="hairline-t overflow-x-auto">
        <table className="w-full min-w-250">
          <thead className="hairline-b">
            <tr>
              <Th>Accession</Th>
              <Th>Patient</Th>
              <Th>Study</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Room</Th>
              <Th>TAT / SLA</Th>
              <Th>Radiologist</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><Td colSpan={8} className="text-center text-muted-foreground p-8 align-middle">Loading worklist...</Td></tr>
            ) : rows.length === 0 ? (
              <tr><Td colSpan={8} className="text-center text-muted-foreground p-8 align-middle">No orders found.</Td></tr>
            ) : rows.map((w) => {
              return (
                <tr key={w._id} className="hairline-b hover:bg-foreground/2">
                  <Td>
                    <span className="mono-label truncate block w-24" title={w.accessionNumber}>{w.accessionNumber || w._id.slice(-8).toUpperCase()}</span>
                  </Td>
                  <Td>
                    <p className="font-medium">{w.patient?.firstName} {w.patient?.lastName}</p>
                    <p className="mono-label text-muted-foreground">
                      {w.patient?.gender}
                    </p>
                  </Td>
                  <Td>
                    <p>{w.testName}</p>
                    <p className="mono-label text-muted-foreground">
                      {w.modality || w.testType}
                    </p>
                  </Td>
                  <Td>
                    <Pill tone={priorityTone(w.priority)}>{w.priority}</Pill>
                  </Td>
                  <Td>
                    <span className="mono-label inline-flex items-center gap-2">
                      {w.status === "IN_PROGRESS" && (
                        <span className="bg-accent size-1.5 animate-pulse rounded-full" />
                      )}
                      {w.status}
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{w.room || "—"}</span>
                  </Td>
                  <Td>
                    <span className="mono-label font-mono">
                      {w.tatMin !== undefined ? <span className={w.tatMin > (w.slaMin || Infinity) ? "text-destructive" : ""}>{w.tatMin}m</span> : "—"}
                      {" / "}
                      {w.slaMin ? `${w.slaMin}m` : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{w.radiologist || "unassigned"}</span>
                  </Td>
                  <Td>
                    <label className="cursor-pointer relative inline-block">
                      <input
                        type="file"
                        className="absolute hidden"
                        accept=".pdf,.dcm,.zip,.jpg,.jpeg,.png"
                        onChange={(e) => handleUpload(w._id, e)}
                        disabled={w.status === "REPORTED"}
                      />
                      <span className={`inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors border border-border ${w.status === "REPORTED" ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground"}`}>
                        <UploadCloud className="size-3.5" /> Upload
                      </span>
                    </label>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
