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
import {
  worklist,
  documents,
  reportTemplates,
  modalities,
  criticalFindings,
  tatStats,
  bookingSlots,
  type WorklistItem,
} from "./radiology-data";
import { fetchPendingOrdersApi, updateOrderStatusApi, uploadDiagnosticReportApi, DiagnosticOrderRecord } from "@/lib/api/radiology";
import { toast } from "sonner";

/* ---------- primitives ---------- */

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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
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

  const loadOrders = async () => {
    try {
      const res = await fetchPendingOrdersApi();
      if (res.status === "success") setOrders(res.data.orders);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "IN_PROGRESS" | "REPORTED" | "CANCELLED") => {
    try {
      const res = await updateOrderStatusApi(id, newStatus);
      if (res.status === "success") {
        toast.success(`Order status updated to ${newStatus}`);
        loadOrders();
      }
    } catch (e) {
      toast.error("Failed to update status");
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
        {tatStats.map((s) => (
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
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              return (
                <tr key={w._id} className="hairline-b hover:bg-foreground/2">
                  <Td>
                    <span className="mono-label truncate block w-24" title={w._id}>{w._id}</span>
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
                      {w.testType} · requested {new Date(w.createdAt).toLocaleDateString()}
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
                    {w.status === "PENDING" && (
                      <button onClick={() => handleUpdateStatus(w._id, "IN_PROGRESS")} className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">Mark In Progress</button>
                    )}
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{w.doctor?.firstName} {w.doctor?.lastName}</span>
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
