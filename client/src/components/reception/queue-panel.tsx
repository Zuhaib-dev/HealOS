"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * states: default · hover · focus · disabled · loading · error · success
 */

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Ticket } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { LiveDot, Pill } from "@/components/workspace/ui";
import { fetchQueueApi, type AppointmentRecord } from "@/lib/api/reception";
import { updateAppointmentStatusApi } from "@/lib/api/appointment";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { ReceptionHeader } from "@/components/reception/reception-header";

function waitMinutes(createdAt: string) {
  return Math.max(
    1,
    Math.round((Date.now() - new Date(createdAt).getTime()) / 60000),
  );
}

function tokenLabel(app: AppointmentRecord) {
  if (app.queueToken || app.token) return app.queueToken || app.token!;
  const prefix = app.department?.charAt(0) || "T";
  return `${prefix}-${app._id.slice(-4).toUpperCase()}`;
}

function patientLabel(app: AppointmentRecord) {
  return app.patient?.name || "Unnamed patient";
}

export function QueuePanel() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(() => {
    fetchQueueApi()
      .then((res) => {
        if (res.status === "success" && res.data?.appointments) {
          setAppointments(res.data.appointments);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadQueue();
    const socket = getSocket();
    if (!socket) return;
    const handleUpdate = () => loadQueue();
    socket.on("appointment_updated", handleUpdate);
    socket.on("appointment_created", handleUpdate);
    socket.on("reception:token_created", handleUpdate);
    return () => {
      socket.off("appointment_updated", handleUpdate);
      socket.off("appointment_created", handleUpdate);
      socket.off("reception:token_created", handleUpdate);
    };
  }, [loadQueue]);

  const handleUpdateStatus = async (
    id: string,
    status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "IN_PROGRESS",
  ) => {
    setBusyId(id);
    try {
      const res = await updateAppointmentStatusApi(id, status);
      if (res.success) {
        toast.success(
          status === "CANCELLED"
            ? "Marked no-show"
            : status === "IN_PROGRESS"
              ? "Token called"
              : `Token marked ${status.toLowerCase()}`,
        );
        loadQueue();
      }
    } catch {
      toast.error("Could not update this token");
    } finally {
      setBusyId(null);
    }
  };

  type DeptQueue = {
    department: string;
    doctor: string;
    nowServing: AppointmentRecord | null;
    waiting: AppointmentRecord[];
  };

  const queuesMap: Record<string, DeptQueue> = {};

  appointments.forEach((app) => {
    const key = app.department || "OPD";
    if (!queuesMap[key]) {
      queuesMap[key] = {
        department: key,
        doctor: app.doctor ? `Dr. ${app.doctor.name || "TBA"}` : "TBA",
        nowServing: null,
        waiting: [],
      };
    }
    if (app.status === "PENDING" || app.status === "CONFIRMED") {
      queuesMap[key].waiting.push(app);
    } else if (
      app.status === "IN_PROGRESS" ||
      app.status === "IN_CONSULTATION"
    ) {
      queuesMap[key].nowServing = app;
      if (app.doctor?.name) {
        queuesMap[key].doctor = `Dr. ${app.doctor.name}`;
      }
    }
  });

  const serving = Object.values(queuesMap);

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <ReceptionHeader
        title="Token queue"
        note="Call the next waiting patient per department. The token updates on this desk immediately."
        actions={
          <ActionButton
            onClick={() => {
              setLoading(true);
              loadQueue();
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ActionButton>
        }
      />

      {loading ? (
        <div className="grid gap-px bg-border/60 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-background p-5 sm:p-8">
              <div className="h-3 w-32 animate-pulse bg-foreground/8" />
              <div className="mt-6 h-14 w-28 animate-pulse bg-foreground/10" />
              <div className="mt-6 h-20 animate-pulse bg-foreground/6" />
            </div>
          ))}
        </div>
      ) : serving.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          No active queues today.
        </div>
      ) : (
        <div className="grid gap-px bg-border/60 lg:grid-cols-2">
          {serving.map((q) => {
            const waits = q.waiting.map((w) => waitMinutes(w.createdAt));
            const avgMin =
              waits.length > 0
                ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
                : 0;
            const next = q.waiting[0];

            return (
              <article
                key={q.department}
                className="bg-background p-4 sm:p-6 lg:p-8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mono-label text-accent/80">
                      OPD · {q.department}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {q.doctor}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2">
                    {q.nowServing ? <LiveDot /> : null}
                    <Pill tone={q.nowServing ? "ok" : "mute"}>
                      {q.nowServing ? "in room" : "idle"}
                    </Pill>
                  </span>
                </div>

                <p className="mono-label mt-5 text-muted-foreground">
                  Now serving
                </p>
                <p className="font-mono text-5xl font-bold tracking-tight text-brass sm:text-6xl">
                  {q.nowServing ? tokenLabel(q.nowServing) : "—"}
                </p>
                {q.nowServing ? (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {patientLabel(q.nowServing)}
                  </p>
                ) : null}

                <div className="mt-5 grid grid-cols-3 gap-px bg-border/60">
                  {[
                    ["Waiting", String(q.waiting.length)],
                    ["Avg wait", avgMin ? `${avgMin}m` : "—"],
                    ["Oldest", waits.length ? `${Math.max(...waits)}m` : "—"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-background px-2 py-3 text-center"
                    >
                      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                        {k}
                      </p>
                      <p className="mt-1 font-mono text-base text-foreground">
                        {v}
                      </p>
                    </div>
                  ))}
                </div>

                {q.waiting.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border/40 border border-border/50">
                    {q.waiting.slice(0, 5).map((w) => (
                      <li
                        key={w._id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm">
                          <span className="mr-2 font-mono text-accent">
                            {tokenLabel(w)}
                          </span>
                          {patientLabel(w)}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {waitMinutes(w.createdAt)}m
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <ActionButton
                    tone="solid"
                    disabled={Boolean(busyId) || !next}
                    onClick={() => {
                      if (next)
                        void handleUpdateStatus(next._id, "IN_PROGRESS");
                      else toast.error("No patients waiting");
                    }}
                  >
                    <Ticket className="mr-1 inline size-3" />
                    Call next
                  </ActionButton>
                  {q.nowServing ? (
                    <ActionButton
                      disabled={Boolean(busyId)}
                      onClick={() =>
                        void handleUpdateStatus(
                          q.nowServing!._id,
                          "IN_PROGRESS",
                        )
                      }
                    >
                      Recall
                    </ActionButton>
                  ) : null}
                  {q.nowServing ? (
                    <ActionButton
                      disabled={Boolean(busyId)}
                      onClick={() =>
                        void handleUpdateStatus(q.nowServing!._id, "CANCELLED")
                      }
                    >
                      No-show
                    </ActionButton>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
