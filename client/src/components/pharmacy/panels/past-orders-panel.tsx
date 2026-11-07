"use client";

/* Hallmark · macrostructure: Catalogue · tone: utilitarian · anchor hue: emerald
 * theme: Emerald Prestige (locked)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import {
  fetchPharmacyHistoryApi,
  type PharmacySaleRecord,
} from "@/lib/api/pharmacy";
import { toast } from "sonner";

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function methodOf(sale: PharmacySaleRecord) {
  return (
    sale.invoice?.paymentMethod ||
    sale.invoice?.paymentHistory?.[sale.invoice.paymentHistory.length - 1]
      ?.method ||
    "—"
  );
}

export function PastOrdersPanel() {
  const [sales, setSales] = useState<PharmacySaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

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
    <section className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col overflow-x-clip">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Dispensed.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} receipts from completed sales
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="mono-label inline-flex h-10 shrink-0 items-center gap-2 border border-border px-3 hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </header>

      <div className="border-b border-border px-4 py-3 sm:px-6">
        <label className="relative block max-w-md">
          <span className="sr-only">Search receipts</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Patient or sale ID"
            className="h-10 w-full border border-border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      {loading ? (
        <div
          className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          Loading receipts
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-display text-xl font-semibold">No receipts yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed sales land here after dispense.
          </p>
        </div>
      ) : (
        <ul className="min-w-0">
          {filtered.map((sale) => {
            const open = openId === sale._id;
            const when = sale.dispensedAt
              ? new Date(sale.dispensedAt).toLocaleString()
              : "—";
            return (
              <li key={sale._id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : sale._id)}
                  aria-expanded={open}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left hover:bg-foreground/3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:px-6"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg font-semibold tracking-tight">
                      {sale.patient?.name || "Patient"}
                    </span>
                    <span className="mono-label mt-1 block truncate text-muted-foreground">
                      {sale._id.slice(-8).toUpperCase()}
                    </span>
                  </span>
                  <span className="hidden truncate text-sm text-muted-foreground sm:block">
                    {when}
                  </span>
                  <span className="text-right text-sm font-medium tabular-nums">
                    {money(sale.invoice?.totalAmount ?? sale.totalAmount)}
                  </span>
                </button>
                {open ? (
                  <div className="grid gap-4 border-t border-border bg-foreground/2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_14rem]">
                    <ul>
                      {sale.items.map((item, index) => (
                        <li
                          key={`${item.name}-${index}`}
                          className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2 text-sm last:border-0"
                        >
                          <span className="min-w-0 truncate">
                            {item.name} × {item.quantity}
                          </span>
                          <span className="tabular-nums">
                            {money(item.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <dl className="grid grid-cols-2 gap-y-2 text-sm md:grid-cols-1">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Status
                        </dt>
                        <dd>{sale.invoice?.status || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Method
                        </dt>
                        <dd className="truncate">{methodOf(sale)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Paid</dt>
                        <dd className="tabular-nums">
                          {money(Number(sale.invoice?.paidAmount || 0))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">By</dt>
                        <dd className="truncate">
                          {sale.dispensedBy?.name ||
                            sale.pharmacist?.name ||
                            "Pharmacy staff"}
                        </dd>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <dt className="text-xs text-muted-foreground">When</dt>
                        <dd className="sm:hidden">{when}</dd>
                        <dd className="hidden sm:block">{when}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
