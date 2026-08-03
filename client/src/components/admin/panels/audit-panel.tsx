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


/* ---------- 07 audit ---------- */

export function AuditPanel() {
  return (
    <section>
      <PanelHeader
        index="07 / AUDIT"
        title="Audit trail & security"
        note="Every privileged action, immutable and timestamped for compliance review."
        actions={<ActionButton>Download 30-day log</ActionButton>}
      />
      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Events today" value="1,284" />
        <Metric label="Privileged actions" value="37" />
        <Metric label="Blocked attempts" value="5" />
        <Metric label="Open incidents" value="1" />
      </div>
      <ol className="px-5 py-6 sm:px-8">
        {audit.map((e) => (
          <li key={e.at} className="hairline-b flex flex-wrap items-center gap-4 py-4">
            <span className="mono-label text-muted-foreground w-20">{e.at}</span>
            <span
              className={`size-1.5 rounded-full ${
                e.level === "crit"
                  ? "bg-destructive animate-pulse"
                  : e.level === "warn"
                    ? "bg-accent"
                    : "bg-muted-foreground/50"
              }`}
            />
            <span className="min-w-0 flex-1 text-sm">{e.action}</span>
            <span className="mono-label text-muted-foreground">{e.actor}</span>
            <span className="mono-label">{e.target}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
