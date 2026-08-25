"use client";

import { useCallback, useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
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
  return <th className="mono-label text-muted-foreground bg-muted/40 px-5 py-4 text-left font-semibold border-b border-border/60 backdrop-blur-md sticky top-0">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-middle text-sm ${className}`}>{children}</td>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/15 text-brass shadow-[0_0_8px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/15 text-destructive shadow-[0_0_8px_color-mix(in_oklab,var(--color-destructive)_15%,transparent)]",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2.5 py-1 rounded-md ${map[tone]}`}>{children}</span>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-5 sm:mx-8 mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-200 border-collapse">{children}</table>
      </div>
    </div>
  );
}


import { fetchAdminInvoicesApi, AdminInvoiceData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- 05 billing ---------- */

export function BillingPanel() {
  const [loading, setLoading] = useState(true);
  const [invoicesData, setInvoicesData] = useState<AdminInvoiceData[]>([]);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminInvoicesApi();
      if (res.success && res.invoices) {
        setInvoicesData(res.invoices);
      }
    } catch (err) {
      console.error("Failed to fetch admin invoices", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadInvoices);
  }, [loadInvoices]);

  useAdminRealtime(["billing", "invoices", "patients"], loadInvoices);

  const totalCollected = invoicesData
    .filter((i) => i.status === "PAID")
    .reduce((a, i) => a + (i.totalAmount || 0), 0);

  const outstanding = invoicesData
    .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
    .reduce((a, i) => a + (i.totalAmount || 0), 0);

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
        <Metric label="Collected MTD" value={`₹${(totalCollected / 1000).toFixed(1)}k`} delta="+Live" />
        <Metric label="Outstanding" value={`₹${(outstanding / 1000).toFixed(1)}k`} />
        <Metric label="Total Invoices" value={String(invoicesData.length)} />
        <Metric label="Days in A/R" value="31" suffix="days" />
      </div>
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Invoice</Th>
            <Th>Patient</Th>
            <Th>Date</Th>
            <Th>Amount</Th>
            <Th>State</Th>
            <Th>{" "}</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="p-12 text-center mono-label text-xs text-muted-foreground animate-pulse">
                Loading ledgers...
              </td>
            </tr>
          ) : invoicesData.length > 0 ? (
            invoicesData.map((inv) => (
              <tr key={inv._id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                <Td>
                  <span className="font-mono text-muted-foreground">{inv._id.slice(-8).toUpperCase()}</span>
                </Td>
                <Td>
                  <span className="font-medium group-hover:text-primary transition-colors">{inv.patient?.name || "Unknown Patient"}</span>
                  <span className="text-muted-foreground text-xs block mt-0.5">
                    {inv.patient?.email}
                  </span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono font-bold">₹{(inv.totalAmount || 0).toLocaleString()}</span>
                </Td>
                <Td>
                  <Pill tone={inv.status === "PAID" ? "ok" : inv.status === "FAILED" || inv.status === "OVERDUE" ? "bad" : "warn"}>
                    {inv.status || "PENDING"}
                  </Pill>
                </Td>
                <Td className="text-right">
                  <button className="text-muted-foreground hover:text-foreground hover:bg-muted/50 p-1.5 rounded-lg transition-colors">
                    <span className="sr-only">Options</span>
                    <ArrowUpRight className="size-4" />
                  </button>
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-16 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                    <ArrowUpRight className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="mono-label text-muted-foreground">No invoices recorded yet.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </TablePanel>
    </section>
  );
}
