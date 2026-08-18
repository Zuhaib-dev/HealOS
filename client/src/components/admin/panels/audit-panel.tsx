import { useCallback, useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";

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

import { fetchAdminAuditLogsApi, AdminAuditLogData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- 07 audit ---------- */

export function AuditPanel() {
  const [loading, setLoading] = useState(true);
  const [dbLogs, setDbLogs] = useState<AdminAuditLogData[]>([]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminAuditLogsApi();
      if (res.success && res.logs) {
        setDbLogs(res.logs);
      }
    } catch (err) {
      console.error("Failed to fetch admin audit logs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadLogs);
  }, [loadLogs]);

  useAdminRealtime(["audit"], loadLogs);

  const totalEvents = dbLogs.length;
  const privActions = dbLogs.filter(l => l.action.includes("Elevated") || l.action.includes("Role")).length;
  const blockedAttempts = dbLogs.filter(l => l.level === "crit" && l.action.includes("Failed")).length;

  return (
    <section>
      <PanelHeader
        index="07 / AUDIT"
        title="Audit trail & security"
        note="Every privileged action, immutable and timestamped for compliance review."
        actions={<ActionButton>Download 30-day log</ActionButton>}
      />
      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Events loaded" value={String(totalEvents)} />
        <Metric label="Privileged actions" value={String(privActions)} />
        <Metric label="Blocked attempts" value={String(blockedAttempts)} />
        <Metric label="Open incidents" value="1" />
      </div>
      {loading ? (
        <div className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
          Loading audit logs from database...
        </div>
      ) : dbLogs.length > 0 ? (
        <ol className="px-5 py-6 sm:px-8">
          {dbLogs.map((e) => (
            <li key={e._id} className="hairline-b flex flex-wrap items-center gap-4 py-4">
              <span className="mono-label text-muted-foreground w-20">
                {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
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
              <span className="mono-label">{e.target || "system"}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="p-8 text-center mono-label text-xs text-muted-foreground">
          No audit logs recorded yet.
        </div>
      )}
    </section>
  );
}
