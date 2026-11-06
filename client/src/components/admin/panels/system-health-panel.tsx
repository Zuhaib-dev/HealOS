"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminHeader } from "../admin-header";
import { useAuthStore } from "@/store/use-auth-store";

type HealthData = {
  database: { status: string; host: string };
  sockets: { status: string; activeChannels: number; gateway: string };
  process: {
    uptime: number;
    memory: {
      heapTotal: number;
      heapUsed: number;
      rss: number;
      external: number;
    };
  };
  environment: {
    nodeVersion: string;
    platform: string;
    mongooseVersion: string;
    appVersion?: string;
    nextjsVersion: string;
  };
};

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="hairline-b hairline-l px-5 py-5">
      <p className="mono-label text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold tracking-tight">
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      ) : null}
    </div>
  );
}

export function SystemHealthPanel() {
  const { token } = useAuthStore();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchHealthData = useCallback(async () => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/system/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setHealthData(json.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchHealthData();
    const interval = setInterval(fetchHealthData, 5000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  };

  const heapPct = healthData
    ? Math.round(
        (healthData.process.memory.heapUsed /
          healthData.process.memory.heapTotal) *
          100,
      )
    : 0;

  return (
    <section>
      <AdminHeader
        title="Health"
        note="Process uptime and integration checks from the server."
        actions={
          <span className="mono-label text-muted-foreground">
            {lastRefreshed
              ? `Refreshed ${lastRefreshed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "Polling every 5s"}
          </span>
        }
      />

      {isLoading && !healthData ? (
        <p className="px-5 py-16 text-center mono-label text-muted-foreground sm:px-8">
          Reading process health…
        </p>
      ) : healthData ? (
        <>
          <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
            <Row
              label="Database"
              value={healthData.database.status}
              note={healthData.database.host}
            />
            <Row
              label="Sockets"
              value={healthData.sockets.status}
              note={`${healthData.sockets.activeChannels} connected · ${healthData.sockets.gateway}`}
            />
            <Row
              label="Uptime"
              value={formatUptime(healthData.process.uptime)}
              note="API process"
            />
            <Row
              label="Heap"
              value={`${heapPct}%`}
              note={`${formatBytes(healthData.process.memory.heapUsed)} / ${formatBytes(healthData.process.memory.heapTotal)}`}
            />
          </div>
          <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
            <Row
              label="RSS"
              value={formatBytes(healthData.process.memory.rss)}
            />
            <Row
              label="External"
              value={formatBytes(healthData.process.memory.external)}
            />
            <Row
              label="Node"
              value={healthData.environment.nodeVersion}
              note={healthData.environment.platform}
            />
            <Row
              label="Runtime"
              value={healthData.environment.appVersion || "—"}
              note={`mongoose ${healthData.environment.mongooseVersion}`}
            />
          </div>
        </>
      ) : (
        <p className="px-5 py-16 text-center mono-label text-muted-foreground sm:px-8">
          Health endpoint did not respond.
        </p>
      )}
    </section>
  );
}
