import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Check, X, TriangleAlert } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  approvals,
  staff,
  wards,
  audit,
  invoices,
  supplies,
  throughput,
} from "./admin-data";
import { ActionButton, PanelHeader } from "./admin-shell";

/* ---------- shared primitives ---------- */

function Metric({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: string;
  delta?: string;
  suffix?: string;
}) {
  return (
    <div className="hairline-l px-5 py-5">
      <p className="mono-label text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
        {value}
        {suffix ? <span className="text-muted-foreground text-base"> {suffix}</span> : null}
      </p>
      {delta ? (
        <p className="mono-label text-brass mt-2 flex items-center gap-1">
          <ArrowUpRight className="size-3" />
          {delta}
        </p>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-b overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">{children}</table>
    </div>
  );
}


/* ---------- 04 wards ---------- */

export function WardsPanel() {
  return (
    <section>
      <PanelHeader
        index="04 / CAPACITY"
        title="Wards & bed board"
        note="Every bay, its occupancy and headroom — refreshed as porters move patients."
        actions={<ActionButton>Open bed board</ActionButton>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        {wards.map((w) => {
          const pct = Math.round((w.used / w.total) * 100);
          const tight = pct >= 85;
          return (
            <div key={w.code} className="hairline-b hairline-l px-5 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-lg font-bold">{w.name}</p>
                  <p className="mono-label text-muted-foreground mt-1">{w.code}</p>
                </div>
                <Pill tone={tight ? "bad" : "ok"}>{tight ? "tight" : "ok"}</Pill>
              </div>
              <div className="mt-5 grid grid-cols-8 gap-1">
                {Array.from({ length: w.total }).slice(0, 24).map((_, i) => (
                  <motion.span
                    key={i}
                    className={`h-3 ${i < Math.min(w.used, 24) ? "bg-accent" : "bg-foreground/[0.08]"}`}
                    initial={{ opacity: 0.2 }}
                    animate={{ opacity: i < Math.min(w.used, 24) ? [0.55, 1, 0.55] : 0.5 }}
                    transition={{ duration: 3, delay: i * 0.05, repeat: Infinity }}
                  />
                ))}
              </div>
              <p className="mono-label text-muted-foreground mt-4">
                {w.used}/{w.total} occupied · {w.total - w.used} free
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
