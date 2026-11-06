"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Loader2, RefreshCw } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { LiveDot, Pill } from "@/components/workspace/ui";
import {
  fetchCallBellsApi,
  resolveCallBellApi,
  type CallBell,
} from "@/lib/api/nurse";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { NurseHeader } from "@/components/nurse/nurse-header";

function fmt(s: number) {
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function CallBellsPanel() {
  const [rows, setRows] = useState<CallBell[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCallBells = useCallback(() => {
    fetchCallBellsApi()
      .then((data) => setRows(data.callBells))
      .catch(() => toast.error("Could not load call bells"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCallBells();
    const socket = getSocket();
    if (!socket) return;
    socket.on("call_bell_updated", loadCallBells);
    socket.on("call_bell_created", loadCallBells);
    return () => {
      socket.off("call_bell_updated", loadCallBells);
      socket.off("call_bell_created", loadCallBells);
    };
  }, [loadCallBells]);

  const waiting = useMemo(
    () => rows.filter((r) => r.state === "waiting"),
    [rows],
  );
  const breaches = waiting.filter((r) => r.waitedSec > 180).length;
  const medianWait = useMemo(() => {
    if (!rows.length) return null;
    const sorted = [...rows].map((r) => r.waitedSec).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  }, [rows]);

  const sorted = [...rows].sort((a, b) => {
    const rank = (r: CallBell) =>
      r.type === "emergency" && r.state === "waiting"
        ? 0
        : r.state === "waiting"
          ? 1
          : r.state === "accepted"
            ? 2
            : 3;
    return rank(a) - rank(b) || b.waitedSec - a.waitedSec;
  });

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <NurseHeader
        title="Call bells"
        note="Live queue by wait time. Emergencies stay at the top until someone answers."
        actions={
          <ActionButton
            onClick={() => {
              setLoading(true);
              loadCallBells();
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ActionButton>
        }
      />

      <div className="grid grid-cols-3 gap-px bg-border/60">
        <div className="bg-background p-4">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Waiting
          </p>
          <p className="mt-1 font-display text-2xl font-bold">
            {waiting.length}
          </p>
        </div>
        <div className="bg-background p-4">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Over 3 min
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{breaches}</p>
        </div>
        <div className="bg-background p-4">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Median wait
          </p>
          <p className="mt-1 font-display text-2xl font-bold">
            {medianWait == null ? "—" : fmt(medianWait)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Bell className="mb-3 size-8 text-muted-foreground/30" />
          <p className="font-medium">No bells</p>
        </div>
      ) : (
        <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => {
            const emergency = c.type === "emergency";
            return (
              <article key={c._id} className="min-w-0 bg-background p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="mono-label text-accent/80">{c.bed}</p>
                  {c.state === "waiting" ? (
                    <LiveDot tone={emergency ? "bad" : "ok"} />
                  ) : null}
                </div>
                <p className="mt-1 truncate font-semibold">{c.patient}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Pill tone={emergency ? "bad" : "info"}>
                    <Bell className="mr-1 inline size-3" />
                    {c.type}
                  </Pill>
                  <Pill tone={c.waitedSec > 120 ? "bad" : "mute"}>
                    {fmt(c.waitedSec)}
                  </Pill>
                  <Pill tone={c.state === "closed" ? "ok" : "warn"}>
                    {c.state}
                  </Pill>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Raised {c.raised}
                  {c.acceptedBy ? ` · ${c.acceptedBy}` : ""}
                </p>
                {c.state !== "closed" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.state === "waiting" ? (
                      <ActionButton
                        tone="solid"
                        disabled={busyId === c._id}
                        onClick={() =>
                          setRows((r) =>
                            r.map((x) =>
                              x._id === c._id
                                ? { ...x, state: "accepted", acceptedBy: "You" }
                                : x,
                            ),
                          )
                        }
                      >
                        Accept
                      </ActionButton>
                    ) : null}
                    <ActionButton
                      disabled={busyId === c._id}
                      onClick={async () => {
                        setBusyId(c._id);
                        try {
                          const res = await resolveCallBellApi(c._id);
                          if (res.success) {
                            setRows((r) =>
                              r.map((x) =>
                                x._id === c._id ? { ...x, state: "closed" } : x,
                              ),
                            );
                            toast.success("Bell closed");
                          }
                        } catch {
                          toast.error("Could not close this bell");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Close
                    </ActionButton>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
