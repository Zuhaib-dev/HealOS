"use client";

import { useCallback, useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground hover:bg-muted/50 p-1.5 rounded-lg transition-colors">
                        <span className="sr-only">Options</span>
                        <ArrowUpRight className="size-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0">
                      {/* Receipt paper container */}
                      <div className="relative bg-card text-card-foreground p-6 pt-10 font-mono shadow-2xl rounded-sm overflow-hidden" 
                           style={{
                             backgroundImage: "radial-gradient(circle at top, transparent 4px, var(--card) 5px)",
                             backgroundSize: "12px 10px",
                             backgroundPosition: "top center",
                             backgroundRepeat: "repeat-x"
                           }}>
                        {/* Zigzag/perforated bottom edge */}
                        <div className="absolute bottom-0 left-0 right-0 h-3 w-full"
                             style={{
                               backgroundImage: "radial-gradient(circle at bottom, transparent 4px, var(--card) 5px)",
                               backgroundSize: "12px 10px",
                               backgroundPosition: "bottom center",
                               backgroundRepeat: "repeat-x"
                             }}
                        />
                        
                        <div className="text-center mb-6 space-y-1">
                          <h2 className="text-xl font-bold tracking-widest uppercase">HealOS Hospital</h2>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">Official Receipt</p>
                          <div className="text-xs pt-2">
                            INV-{inv._id.slice(-8).toUpperCase()}
                          </div>
                        </div>

                        <div className="space-y-4 text-sm relative z-10 mb-4">
                          <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                            <span className="text-muted-foreground uppercase text-xs">Date</span>
                            <span>{new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          
                          <div className="flex justify-between items-start border-b border-dashed border-border/60 pb-3">
                            <span className="text-muted-foreground uppercase text-xs">Patient</span>
                            <div className="text-right">
                              <span className="font-bold">{inv.patient?.name || "Unknown Patient"}</span>
                              {inv.patient?.phone && (
                                <span className="block mt-0.5">{inv.patient.phone}</span>
                              )}
                              {inv.patient?.email && (
                                <span className="block text-xs mt-0.5">{inv.patient.email}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                            <span className="text-muted-foreground uppercase text-xs">Status</span>
                            <span className="font-bold uppercase tracking-wider">{inv.status || "PENDING"}</span>
                          </div>

                          <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                            <span className="text-muted-foreground uppercase text-xs">Method</span>
                            <span className="uppercase">{inv.paymentMethod || inv.type || "Online"}</span>
                          </div>
                          
                          {inv.items && inv.items.length > 0 && (
                            <div className="py-2">
                              <span className="text-muted-foreground uppercase text-xs mb-3 block">Items</span>
                              <div className="space-y-2">
                                {inv.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-start gap-4">
                                    <span className="leading-tight">{item.description}</span>
                                    <span>₹{item.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="border-t-2 border-dashed border-border pt-4 mt-2 pb-6 relative z-10">
                          <div className="flex justify-between items-center">
                            <span className="uppercase font-bold tracking-widest text-lg">Total</span>
                            <span className="text-2xl font-bold tracking-tight">₹{(inv.totalAmount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="text-center mt-2 mb-2 pb-4 opacity-50 relative z-10">
                          {/* Fake barcode */}
                          <div className="h-8 w-full flex items-center justify-center gap-0.5">
                            {Array.from({ length: 30 }).map((_, i) => (
                              <div key={i} className="h-full bg-foreground" style={{ width: `${Math.random() * 4 + 1}px`, opacity: Math.random() > 0.3 ? 1 : 0 }} />
                            ))}
                          </div>
                          <p className="text-[10px] mt-2 uppercase tracking-widest">Thank you</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
