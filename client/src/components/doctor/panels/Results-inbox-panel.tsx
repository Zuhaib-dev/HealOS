"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Eye } from "lucide-react";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import { toast } from "sonner";
import { getDiagnosticResultsApi } from "@/lib/api/doctor";
import { getSocket } from "@/lib/socket";
import { openProtectedReport } from "@/lib/api/reports";

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
  return (
    <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

/* ---------- 04 · Results inbox ---------- */

export function ResultsPanel() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical">("all");

  const loadResults = () => {
    getDiagnosticResultsApi()
      .then((res) => setResults(res.data.results || []))
      .catch(() => toast.error("Failed to load results"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadResults();
    const socket = getSocket();
    if (socket) {
      socket.on("report_ready", loadResults);
      socket.on("lab_report_validated", loadResults);
      return () => {
        socket.off("report_ready", loadResults);
        socket.off("lab_report_validated", loadResults);
      };
    }
  }, []);

  const rows = results.filter((r) =>
    filter === "critical" ? r.isCritical : true,
  );

  return (
    <div className="pb-24">
      <DoctorHeader
        title="Results"
        note="Released reports from labs you ordered. Critical flags come from the lab."
      />
      <div className="hairline-b flex gap-1 px-5 py-3 sm:px-8">
        {(
          [
            ["all", "All"],
            ["critical", "Critical"],
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-205">
          <thead className="hairline-b">
            <tr>
              <Th>At</Th>
              <Th>Patient</Th>
              <Th>Test</Th>
              <Th>Kind</Th>
              <Th>Value</Th>
              <Th>Flag</Th>
              <Th>Report</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-muted-foreground"
                >
                  Loading results...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-muted-foreground"
                >
                  No diagnostic results found.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const patName =
                  typeof r.patient === "object" ? r.patient?.name : "Unknown";
                const testName = r.order?.testName || "Unknown Test";
                const kind = r.order?.testType || "TEST";
                return (
                  <motion.tr key={r._id} layout className="hairline-b">
                    <Td>
                      <span className="mono-label">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </Td>
                    <Td>
                      <span className="block font-medium">{patName}</span>
                    </Td>
                    <Td>{testName}</Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">
                        {kind}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`mono-label ${r.isCritical ? "text-destructive" : ""}`}
                      >
                        {r.findings || "Open report to review"}
                      </span>
                    </Td>
                    <Td>
                      {r.isCritical ? (
                        <Pill tone="bad">critical</Pill>
                      ) : (
                        <Pill tone="mute">released</Pill>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {r.fileUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openProtectedReport(r._id).catch(() =>
                                toast.error("Unable to open this report"),
                              )
                            }
                            className="size-8 rounded-md bg-foreground/5 hover:bg-foreground/10 text-foreground flex items-center justify-center shrink-0 transition-colors"
                            title="View Document"
                          >
                            <Eye className="size-4" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
