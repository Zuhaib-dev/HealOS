"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, RefreshCw } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import {
  fetchEmergencyPendingApi,
  type EmergencyPendingTask,
} from "@/lib/api/emergency";

export function EmergencyPendingPanel() {
  const [tasks, setTasks] = useState<EmergencyPendingTask[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await fetchEmergencyPendingApi();
      setTasks(result.tasks);
      setCounts(result.counts);
    } catch (error) {
      console.error("Failed to load ED pending work:", error);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section>
      <PanelHeader
        index="02 / department work queue"
        title="Pending work"
        note="Outstanding actions derived from live ED cases, orders, results, admissions and pharmacy records. Closed visits with unfinished work remain visible for follow-up."
        actions={
          <ActionButton onClick={() => void load()}>
            <RefreshCw className="mr-1 inline size-3" /> Refresh
          </ActionButton>
        }
      />
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="bg-background p-4">
            <p className="mono-label text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>
      {busy ? (
        <p
          role="status"
          className="p-10 text-center mono-label text-muted-foreground"
        >
          Loading outstanding ED work…
        </p>
      ) : tasks.length ? (
        <ul className="mt-px divide-y divide-border border-b border-border">
          {tasks.map((task, i) => (
            <li
              key={`${task.caseId}-${task.category}-${task.title}-${i}`}
              className="flex flex-col gap-3 bg-background p-4 sm:flex-row sm:items-center"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <ClipboardList className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill
                    tone={
                      task.esi <= 2 ? "bad" : task.esi === 3 ? "warn" : "mute"
                    }
                  >
                    ESI {task.esi}
                  </Pill>
                  <span className="mono-label text-accent">
                    {task.category}
                  </span>
                  <span className="mono-label text-muted-foreground">
                    {task.caseId}
                  </span>
                </div>
                <p className="mt-1 font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  {task.patient}
                  {task.detail ? ` · ${task.detail}` : ""}
                </p>
              </div>
              <Link
                href={task.actionHref || task.href}
                className="inline-flex h-10 items-center justify-center bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
              >
                Open record
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="hairline mt-px bg-background p-12 text-center">
          <ClipboardList className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-medium">No pending ED work</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No outstanding actions were found in the current 180-day work
            window.
          </p>
        </div>
      )}
    </section>
  );
}
