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


/* ---------- 03 fluid balance (mock data) ---------- */

export function FluidPanel() {
  const [entries, setEntries] = useState(fluidBalance);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"oral" | "iv" | "urine" | "drain">("oral");

  const commit = (bed: string) => {
    const v = Number(amount);
    if (!v) return;
    setEntries((list) =>
      list.map((e) =>
        e.bed !== bed
          ? e
          : {
              ...e,
              intakeOral: kind === "oral" ? e.intakeOral + v : e.intakeOral,
              intakeIV: kind === "iv" ? e.intakeIV + v : e.intakeIV,
              outputUrine: kind === "urine" ? e.outputUrine + v : e.outputUrine,
              outputDrain: kind === "drain" ? e.outputDrain + v : e.outputDrain,
            },
      ),
    );
    setAmount("");
    setAddTo(null);
  };

  return (
    <section>
      <PanelHeader
        index="03 / balance"
        title="Fluid balance"
        note="Running 24-hour intake and output per bed, measured against the prescribed target and any restriction."
        actions={<ActionButton tone="solid">Close 24h chart</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {entries.map((e) => {
          const intake = e.intakeOral + e.intakeIV;
          const output = e.outputUrine + e.outputDrain;
          const net = intake - output;
          const onTarget = e.target <= 0 ? net <= e.target + 250 : net >= e.target - 250;
          const width = Math.min(100, (Math.abs(net) / 1800) * 100);
          return (
            <div key={e.bed} className="bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">{e.bed}</p>
                  <p className="mt-1 font-mono text-lg font-bold">{e.patient}</p>
                </div>
                <Pill tone={onTarget ? "ok" : "bad"}>
                  net {net > 0 ? "+" : ""}{net} mL
                </Pill>
              </div>

              <div className="mono-label mt-4 grid grid-cols-4 gap-px" style={{ background: "var(--hairline)" }}>
                {[
                  ["Oral", `${e.intakeOral}`],
                  ["IV", `${e.intakeIV}`],
                  ["Urine", `${e.outputUrine}`],
                  ["Drain", `${e.outputDrain}`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-background px-2 py-3 text-center">
                    <p className="text-muted-foreground">{k}</p>
                    <p className="text-foreground mt-1 font-mono text-base">{v}</p>
                  </div>
                ))}
              </div>

              <div className="hairline mt-4 h-2 w-full">
                <motion.div
                  className={net >= 0 ? "bg-accent h-full" : "bg-destructive h-full"}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </div>
              <p className="mono-label text-muted-foreground mt-2">
                <Droplets className="mr-1 inline size-3" />
                target {e.target > 0 ? "+" : ""}{e.target} mL
                {e.restriction ? ` · restriction ${e.restriction} mL/24h` : ""}
              </p>

              {addTo === e.bed ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {(["oral", "iv", "urine", "drain"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setKind(k)} className={`mono-label px-2.5 py-1.5 ${kind === k ? "bg-foreground text-background" : "hairline"}`}>
                      {k}
                    </button>
                  ))}
                  <input value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder="mL" className="hairline w-20 bg-transparent px-2 py-1.5 font-mono text-sm outline-none" />
                  <ActionButton tone="solid" onClick={() => commit(e.bed)}>Log</ActionButton>
                </div>
              ) : (
                <div className="mt-4">
                  <ActionButton onClick={() => setAddTo(e.bed)}>Log intake / output</ActionButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
