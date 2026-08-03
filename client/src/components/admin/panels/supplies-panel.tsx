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
} from "../admin-data";
import { ActionButton, PanelHeader } from "../admin-shell";

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


/* ---------- 06 supplies ---------- */

export function SuppliesPanel() {
  return (
    <section>
      <PanelHeader
        index="06 / SUPPLY"
        title="Pharmacy & stores"
        note="Consumption against reorder thresholds for controlled and critical stock."
        actions={<ActionButton tone="solid">Create purchase order</ActionButton>}
      />
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Item</Th>
            <Th>Code</Th>
            <Th>On hand</Th>
            <Th>Reorder at</Th>
            <Th>Signal</Th>
          </tr>
        </thead>
        <tbody>
          {supplies.map((s) => {
            const low = s.stock < s.reorder;
            return (
              <tr key={s.code} className="hairline-b">
                <Td>
                  <span className="font-medium">{s.item}</span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{s.code}</span>
                </Td>
                <Td>
                  <span className="font-mono font-bold">{s.stock}</span>{" "}
                  <span className="mono-label text-muted-foreground">{s.unit}</span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">
                    {s.reorder} {s.unit}
                  </span>
                </Td>
                <Td>
                  {low ? (
                    <span className="mono-label text-destructive flex items-center gap-1.5">
                      <TriangleAlert className="size-3" /> reorder now
                    </span>
                  ) : (
                    <Pill tone="ok">healthy</Pill>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TablePanel>
    </section>
  );
}
