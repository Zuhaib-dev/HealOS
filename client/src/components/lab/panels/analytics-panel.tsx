"use client";

import { useEffect, useState } from "react";
import { PanelHeader } from "@/components/admin/admin-shell";
import { Card, StatGrid } from "@/components/workspace/ui";
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
  const maxDaily = Math.max(
    1,
    ...(data?.dailyVolume.map((day) => day.count) || []),
  );
  return (
    <section>
      <PanelHeader
        index="06 / operations"
        title="Laboratory analytics"
        note="Turnaround, workload, service level breaches, and test demand for the selected period."
        actions={
          <select
            aria-label="Analytics period"
            value={days}
            onChange={(event) =>
              setDays(Number(event.target.value) as 7 | 30 | 90)
            }
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />
      {loading ? (
        <p className="p-8 text-center text-muted-foreground">
          Loading analytics…
        </p>
      ) : !data ? (
        <p className="p-8 text-center text-muted-foreground">
          No analytics available.
        </p>
      ) : (
        <>
          <StatGrid
            cols={4}
            stats={[
              {
                label: "Total tests",
                value: String(data.totalOrders),
                note: `${days} day period`,
              },
              {
                label: "Completed",
                value: String(data.completedOrders),
                note: "Reports entered",
              },
              {
                label: "Awaiting collection",
                value: String(data.pendingOrders),
                note: "Pending orders",
              },
              {
                label: "In process",
                value: String(data.inProgressOrders),
                note: "Active orders",
              },
              {
                label: "Average turnaround",
                value: formatMinutes(data.averageTATMinutes),
                note: "From collection to report",
              },
              {
                label: "90th percentile",
                value: formatMinutes(data.p90TATMinutes),
                note: "From collection to report",
              },
              {
                label: "SLA breaches",
                value: String(data.slaBreaches),
                note: "Completed orders over target",
              },
            ]}
          />
          <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
            <Card>
              <h2 className="font-semibold">Daily test volume</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Orders created per day · {days} day view
              </p>
              <div className="mt-5 flex h-48 items-end gap-1 overflow-x-auto border-b border-border pb-1">
                {data.dailyVolume.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count}`}
                    className="flex min-w-3 flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {day.count}
                    </span>
                    <div
                      className="w-full max-w-6 rounded-t bg-primary/75"
                      style={{
                        height: `${Math.max(3, (day.count / maxDaily) * 130)}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold">Most requested tests</h2>
              <ol className="mt-4 space-y-3">
                {data.topTests.length ? (
                  data.topTests.map((test, index) => (
                    <li
                      key={test.testName}
                      className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm"
                    >
                      <span className="truncate">
                        <span className="mr-2 text-xs text-muted-foreground">
                          {index + 1}.
                        </span>
                        {test.testName}
                      </span>
                      <strong>{test.count}</strong>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">
                    No test orders in this period.
                  </li>
                )}
              </ol>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
