"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Radiation,
  Activity,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Layers,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import { fetchModalitiesApi, ModalityMachineRecord } from "@/lib/api/radiology";
import { toast } from "sonner";

function ScannerGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full" aria-hidden="true">
      <rect
        x="8"
        y="12"
        width="104"
        height="48"
        rx="6"
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth="1.5"
      />
      <circle
        cx="60"
        cy="36"
        r="18"
        fill="none"
        stroke="currentColor"
        className="text-primary/30"
        strokeWidth="1.5"
      />
      <circle
        cx="60"
        cy="36"
        r="8"
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth="2"
      />
      {active && (
        <motion.line
          x1="12"
          x2="108"
          y1="16"
          y2="16"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2"
          animate={{ y1: [16, 56, 16], y2: [16, 56, 16] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}

export function ModalitiesPanel() {
  const [modalities, setModalities] = useState<ModalityMachineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchModalitiesApi();
      if (res.status === "success") {
        setModalities(res.data.modalities || []);
      }
    } catch {
      toast.error("Failed to load modality equipment telemetry");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const modalityTypes = useMemo(() => {
    const set = new Set<string>();
    modalities.forEach((m) => {
      if (m.modality) set.add(m.modality);
    });
    return Array.from(set);
  }, [modalities]);

  const activeScanningCount = useMemo(
    () => modalities.filter((m) => m.state === "scanning").length,
    [modalities],
  );

  const totalQueueDepth = useMemo(
    () => modalities.reduce((acc, m) => acc + (m.queue || 0), 0),
    [modalities],
  );

  const filtered = useMemo(() => {
    if (filter === "ALL") return modalities;
    return modalities.filter((m) => m.modality === filter);
  }, [modalities, filter]);

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="06 / equipment & pacs telemetry"
        title="Imaging Modalities & Radiation Safety"
        note="Live scanner states, queue depth, dose index monitoring (CTDIvol / DLP), 30-day uptime metrics, and preventative maintenance windows."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              aria-label="Refresh telemetry"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Top Telemetry Metric Bar */}
      <div className="p-4 sm:px-6 bg-card/40 border-b border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">
                Active Scanning Scanners
              </p>
              <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeScanningCount} / {modalities.length}
              </p>
            </div>
            <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Activity className="size-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">
                Department Total Queue
              </p>
              <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                {totalQueueDepth} studies
              </p>
            </div>
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-semibold">
                Dose Optimization Safety
              </p>
              <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                ALARA Compliant
              </p>
            </div>
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldAlert className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Modality Filter Chips */}
      <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
            filter === "ALL"
              ? "bg-foreground text-background font-semibold shadow-xs"
              : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          All Equipment ({modalities.length})
        </button>
        {modalityTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
              filter === type
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Equipment Cards Grid */}
      <div className="flex-1 p-4 sm:p-6 bg-muted/15">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
            <p className="font-mono text-sm">
              Querying PACS modality status...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-card rounded-2xl border border-border/70 p-8">
            <Radiation className="size-12 mb-3 opacity-30 text-primary" />
            <p className="font-bold text-foreground text-base">
              No Equipment Found
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => {
              const isScanning = m.state === "scanning";
              const isIdle = m.state === "idle";
              const isMaintenance = m.state === "maintenance";

              return (
                <div
                  key={m._id}
                  className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Cpu className="size-4 text-primary" />
                          <h3 className="font-mono text-base font-bold text-foreground">
                            {m.room}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.modality} · {m.vendor}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isScanning
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : isIdle
                              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                              : isMaintenance
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-rose-500/15 text-rose-600"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            isScanning
                              ? "bg-emerald-500 animate-pulse"
                              : isIdle
                                ? "bg-cyan-500"
                                : "bg-muted-foreground"
                          }`}
                        />
                        <span className="capitalize">{m.state}</span>
                      </span>
                    </div>

                    {/* Scanner Live Animation Display */}
                    <div className="my-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <ScannerGlyph active={isScanning} />
                    </div>

                    {/* Telemetry Metrics */}
                    <dl className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-card border border-border/60">
                        <dt className="text-[10px] text-muted-foreground uppercase">
                          Study Queue
                        </dt>
                        <dd className="text-base font-bold text-foreground mt-0.5">
                          {m.queue} studies
                        </dd>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border/60">
                        <dt className="text-[10px] text-muted-foreground uppercase">
                          30d Uptime
                        </dt>
                        <dd className="text-base font-bold text-foreground mt-0.5">
                          {m.uptime}
                        </dd>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border/60">
                        <dt className="text-[10px] text-muted-foreground uppercase">
                          Dose Index
                        </dt>
                        <dd className="text-xs font-bold text-primary mt-1">
                          {m.doseIndex}
                        </dd>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border/60">
                        <dt className="text-[10px] text-muted-foreground uppercase">
                          Next Service
                        </dt>
                        <dd className="text-xs font-medium text-foreground mt-1">
                          {m.nextService}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
