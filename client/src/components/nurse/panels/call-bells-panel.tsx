"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Droplets, Bandage, Bell } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, Sparkline, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchCallBellsApi, type CallBell } from "@/lib/api/nurse";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";


/* ---------- 06 call bells (real data) ---------- */

function fmt(s: number) {
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function CallBellsPanel() {
  const [rows, setRows] = useState<CallBell[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCallBells = () => {
    fetchCallBellsApi()
      .then((data) => {
        setRows(data.callBells);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load call bells");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCallBells();
    const socket = getSocket();
    if (socket) {
      socket.on("call_bell_updated", loadCallBells);
      socket.on("call_bell_created", loadCallBells);
      return () => {
        socket.off("call_bell_updated", loadCallBells);
        socket.off("call_bell_created", loadCallBells);
      };
    }
  }, []);
  const waiting = useMemo(() => rows.filter((r) => r.state === "waiting"), [rows]);

  return (
    <section>
      <PanelHeader
        index="06 / call bells"
        title="Call-bell queue"
        note="Live queue by wait time. Emergency pulls rise above everything and record a response-time audit trail."
        actions={<ActionButton tone="solid">{waiting.length} waiting</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground col-span-3">Loading call bells...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground col-span-3">No call bells found.</div>
        ) : rows
          .slice()
          .sort((a, b) => {
            const rank = (r: typeof a) => (r.state === "waiting" ? 0 : r.state === "accepted" ? 1 : 2);
            return rank(a) - rank(b) || b.waitedSec - a.waitedSec;
          })
          .map((c) => {
            const emergency = c.type === "emergency";
            return (
              <div key={c._id} className="bg-background p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="mono-label text-accent/80">{c.bed}</p>
                  {c.state === "waiting" && <LiveDot tone={emergency ? "bad" : "ok"} />}
                </div>
                <p className="mt-1 font-mono text-lg font-bold">{c.patient}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill tone={emergency ? "bad" : "info"}>
                    <Bell className="mr-1 inline size-3" />
                    {c.type}
                  </Pill>
                  <Pill tone={c.waitedSec > 120 ? "bad" : "mute"}>{fmt(c.waitedSec)}</Pill>
                  <Pill tone={c.state === "closed" ? "ok" : "warn"}>{c.state}</Pill>
                </div>
                <p className="mono-label text-muted-foreground mt-3">
                  raised {c.raised}
                  {c.acceptedBy ? ` · ${c.acceptedBy}` : ""}
                </p>
                <div className="mt-4 flex gap-2">
                  <ActionButton
                    tone="solid"
                    onClick={() =>
                      setRows((r) =>
                        r.map((x) =>
                          x._id === c._id ? { ...x, state: "accepted", acceptedBy: "You" } : x,
                        ),
                      )
                    }
                  >
                    Accept
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      setRows((r) => r.map((x) => (x._id === c._id ? { ...x, state: "closed" } : x)))
                    }
                  >
                    Close
                  </ActionButton>
                </div>
              </div>
            );
          })}
      </div>

      <div className="hairline-t p-5 sm:px-8">
        <Card>
          <p className="mono-label text-muted-foreground">Response-time audit · this shift</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              ["Median response", "48 s"],
              ["Breaches > 3 min", "1"],
              ["Bells answered", "37"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-2xl font-bold">{v}</p>
                <p className="mono-label text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
