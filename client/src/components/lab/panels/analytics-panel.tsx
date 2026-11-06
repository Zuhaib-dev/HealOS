"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import { Card } from "@/components/workspace/ui";
import { fetchLabAnalyticsApi } from "@/lib/api/lab";
import { toast } from "sonner";

type Analytics = {
  days: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  averageTATMinutes: number | null;
  p90TATMinutes: number | null;
  slaBreaches: number;
  dailyVolume: { date: string; count: number }[];
  topTests: { testName: string; count: number }[];
};

const formatMinutes = (value: number | null) =>
  value == null
    ? "—"
    : value < 60
      ? `${value} min`
      : `${Math.floor(value / 60)}h ${value % 60}m`;

export function AnalyticsPanel() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLabAnalyticsApi(days)
      .then((result) => {
        if (!cancelled) setData(result.analytics);
      })
      .catch(() => {
        if (!cancelled) toast.error("Unable to load laboratory analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const maxDaily = useMemo(
    () => Math.max(1, ...(data?.dailyVolume.map((d) => d.count) || [1])),
    [data],
  );

  const totalTopTestVolume = useMemo(
    () => (data?.topTests || []).reduce((acc, t) => acc + t.count, 0) || 1,
    [data],
  );

  const slaCompliance = useMemo(() => {
    if (!data || data.completedOrders === 0) return 100;
    const onTime = Math.max(0, data.completedOrders - data.slaBreaches);
    return Math.round((onTime / data.completedOrders) * 100);
  }, [data]);

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="06 / operations & intelligence"
        title="Laboratory Operations & TAT Analytics"
        note="Turnaround times, service-level compliance (SLA), daily specimen throughput, and test distribution."
        actions={
          <div className="flex bg-muted/60 p-1 rounded-lg border border-border/70">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  days === d
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === 7 ? "7 Days" : d === 30 ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
          <RefreshCw className="size-8 animate-spin text-primary mb-3" />
          <p className="font-mono text-sm">
            Aggregating diagnostic throughput data...
          </p>
        </div>
      ) : !data ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <p className="font-medium text-foreground">
            No laboratory records available
          </p>
        </div>
      ) : (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 bg-muted/10">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-muted-foreground font-semibold">
                  Total Requisitions
                </span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BarChart3 className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-mono text-3xl font-bold text-foreground">
                  {data.totalOrders}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Across last {days} days
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-muted-foreground font-semibold">
                  SLA Compliance
                </span>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Award className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-mono text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {slaCompliance}%
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {data.slaBreaches} SLA breach
                  {data.slaBreaches === 1 ? "" : "es"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-muted-foreground font-semibold">
                  Average Turnaround
                </span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-mono text-3xl font-bold text-foreground">
                  {formatMinutes(data.averageTATMinutes)}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Collection to validated sign-off
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-muted-foreground font-semibold">
                  90th Percentile TAT
                </span>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-mono text-3xl font-bold text-foreground">
                  {formatMinutes(data.p90TATMinutes)}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Worst 10% outlier threshold
                </span>
              </div>
            </div>
          </div>

          {/* Operational Pipeline Snapshot */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <h3 className="font-mono text-sm font-bold text-foreground mb-3">
              Specimen Pipeline Status
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-muted/40">
                <span className="text-xs text-muted-foreground block">
                  Awaiting Phlebotomy
                </span>
                <span className="font-mono text-2xl font-bold text-foreground mt-1 block">
                  {data.pendingOrders}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <span className="text-xs text-muted-foreground block">
                  In Lab Bench Processing
                </span>
                <span className="font-mono text-2xl font-bold text-primary mt-1 block">
                  {data.inProgressOrders}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <span className="text-xs text-muted-foreground block">
                  Completed &amp; Released
                </span>
                <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {data.completedOrders}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Histogram and Top Tests Layout */}
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            {/* Daily Throughput Histogram */}
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-mono text-base font-bold text-foreground">
                    Daily Requisition Volume
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Specimens ordered per 24-hour cycle over {days} days
                  </p>
                </div>
                {hoveredDay && (
                  <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-mono text-xs font-semibold">
                    {hoveredDay.date}: <strong>{hoveredDay.count} tests</strong>
                  </div>
                )}
              </div>

              {/* Chart container */}
              <div className="mt-4 pt-6 pb-2 border-b border-border/70">
                <div className="flex h-52 items-end gap-1.5 overflow-x-auto custom-scrollbar px-1">
                  {data.dailyVolume.map((day) => {
                    const heightPercent = Math.max(
                      4,
                      (day.count / maxDaily) * 100,
                    );
                    const isHovered = hoveredDay?.date === day.date;

                    return (
                      <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group cursor-pointer"
                      >
                        <div
                          className={`w-full rounded-t transition-all ${
                            isHovered
                              ? "bg-primary shadow-sm scale-y-[1.02]"
                              : "bg-primary/70 group-hover:bg-primary/90"
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2 px-1">
                  <span>{data.dailyVolume[0]?.date || "Start"}</span>
                  <span>
                    {data.dailyVolume[data.dailyVolume.length - 1]?.date ||
                      "Today"}
                  </span>
                </div>
              </div>
            </div>

            {/* Most Requested Tests Leaderboard */}
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-mono text-base font-bold text-foreground">
                  High-Demand Panels
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Most requested tests across all hospital departments
                </p>

                <div className="mt-5 space-y-3.5">
                  {data.topTests.length ? (
                    data.topTests.map((test, index) => {
                      const share = Math.round(
                        (test.count / totalTopTestVolume) * 100,
                      );

                      return (
                        <div key={test.testName} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground truncate max-w-[200px]">
                              <span className="text-muted-foreground mr-1.5 font-mono text-[11px]">
                                {index + 1}.
                              </span>
                              {test.testName}
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {test.count}{" "}
                              <span className="text-muted-foreground font-normal text-[10px]">
                                ({share}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground py-8 text-center italic">
                      No test data recorded for this period.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
