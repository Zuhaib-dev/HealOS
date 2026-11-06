"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pill, Search, ShieldCheck, RefreshCw } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  fetchPharmacyHistoryApi,
  type PharmacySaleRecord,
} from "@/lib/api/pharmacy";
import { toast } from "sonner";

export function PastOrdersPanel() {
  const [sales, setSales] = useState<PharmacySaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetchPharmacyHistoryApi();
      setSales(response.sales);
    } catch {
      toast.error("Unable to load pharmacy receipts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      sales.filter((sale) =>
        `${sale.patient?.name || ""} ${sale._id} ${sale.invoice?._id || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [sales, search],
  );

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <PanelHeader
        index="02 / history"
        title="Dispensed orders"
        note="Receipts are pulled from completed sales and their real patient invoices."
        actions={
          <ActionButton onClick={() => void load()}>
            <RefreshCw className="mr-2 size-3" />
            Refresh ledger
          </ActionButton>
        }
      />
      <div className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient or sale ID"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} dispensed sale(s)
          </p>
        </div>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-3 size-6 animate-spin" />
            Loading completed sales…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
            <ShieldCheck className="mb-3 size-10 text-muted-foreground/40" />
            <p className="font-medium">No dispensed sales found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Completed paid orders will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((sale) => (
              <article
                key={sale._id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {sale.patient?.name || "Patient"}
                      </h2>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        DISPENSED
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sale {sale._id.slice(-8).toUpperCase()} · Invoice{" "}
                      {sale.invoice?._id?.slice(-8).toUpperCase() || "—"} ·{" "}
                      {sale.dispensedAt
                        ? new Date(sale.dispensedAt).toLocaleString()
                        : "Date unavailable"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Invoice total
                    </p>
                    <p className="text-2xl font-semibold">
                      ₹
                      {Number(
                        sale.invoice?.totalAmount ?? sale.totalAmount,
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 pt-4 md:grid-cols-[1fr_240px]">
                  <div className="space-y-2">
                    {sale.items.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-3 py-2.5 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <Pill className="size-4 text-primary" />
                          {item.name} × {item.quantity}
                        </span>
                        <span>₹{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">
                      Payment state
                    </p>
                    <p className="mt-1 font-semibold">
                      {sale.invoice?.status || "Unknown"}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">Method</p>
                    <p className="mt-1 font-semibold">
                      {sale.invoice?.paymentMethod ||
                        sale.invoice?.paymentHistory?.[
                          sale.invoice.paymentHistory.length - 1
                        ]?.method ||
                        "Not recorded"}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">Paid</p>
                    <p className="mt-1 font-semibold">
                      ₹{Number(sale.invoice?.paidAmount || 0).toFixed(2)}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Dispensed by
                    </p>
                    <p className="mt-1 font-semibold">
                      {sale.dispensedBy?.name ||
                        sale.pharmacist?.name ||
                        "Pharmacy staff"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
