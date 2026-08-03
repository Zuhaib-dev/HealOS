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


/* ---------- 05 billing ---------- */

export function BillingPanel() {
  const outstanding = invoices
    .filter((i) => i.state !== "Paid")
    .reduce((a, i) => a + i.amount, 0);

  return (
    <section>
      <PanelHeader
        index="05 / REVENUE"
        title="Revenue ledger"
        note="Claims, payer mix and disputes with the exposure each one carries."
        actions={
          <>
            <ActionButton>Export ledger</ActionButton>
            <ActionButton tone="solid">Raise invoice</ActionButton>
          </>
        }
      />
      <div className="hairline-b grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Collected MTD" value="$4.71M" delta="+8.9%" />
        <Metric label="Outstanding" value={`$${(outstanding / 1000).toFixed(1)}k`} />
        <Metric label="Denial rate" value="2.4" suffix="%" />
        <Metric label="Days in A/R" value="31" suffix="days" />
      </div>
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Invoice</Th>
            <Th>Patient</Th>
            <Th>Payer</Th>
            <Th>Amount</Th>
            <Th>State</Th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="hairline-b">
              <Td>
                <span className="mono-label">{i.id}</span>
              </Td>
              <Td>
                <span className="mono-label text-muted-foreground">{i.patient}</span>
              </Td>
              <Td>{i.payer}</Td>
              <Td>
                <span className="font-mono font-bold">${i.amount.toLocaleString()}</span>
              </Td>
              <Td>
                <Pill tone={i.state === "Paid" ? "ok" : i.state === "Disputed" ? "bad" : "warn"}>
                  {i.state}
                </Pill>
              </Td>
            </tr>
          ))}
        </tbody>
      </TablePanel>
    </section>
  );
}
