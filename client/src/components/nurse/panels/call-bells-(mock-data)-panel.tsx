"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Droplets, Bandage, Bell } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, Sparkline, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import {
  callBells,
  fluidBalance,
  handover,
  marDoses,
  shiftStats,
  wounds,
  type MarDose,
} from "./nurse-data";
import {
  fetchVitalsQueueApi,
  recordVitalsApi,
  VitalsQueueItem,
} from "@/lib/api/nurse";
import { toast } from "sonner";


/* ---------- 06 call bells (mock data) ---------- */

function fmt(s: number) {
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function CallBellPanel() {
  const [rows, setRows] = useState(callBells);
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
        {rows
          .slice()
          .sort((a, b) => {
            const rank = (r: typeof a) => (r.state === "waiting" ? 0 : r.state === "accepted" ? 1 : 2);
            return rank(a) - rank(b) || b.waitedSec - a.waitedSec;
          })
          .map((c) => {
            const emergency = c.type === "emergency";
            return (
              <div key={c.id} className="bg-background p-5">
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
                          x.id === c.id ? { ...x, state: "accepted", acceptedBy: "You" } : x,
                        ),
                      )
                    }
                  >
                    Accept
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      setRows((r) => r.map((x) => (x.id === c.id ? { ...x, state: "closed" } : x)))
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
