"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * states: default · hover · focus · disabled · loading · error · success
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Landmark,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import {
  fetchPendingBillsApi,
  payBillApi,
  type InvoiceRecord,
} from "@/lib/api/reception";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { ReceptionHeader } from "@/components/reception/reception-header";

type PayMode = "CASH" | "CARD" | "UPI" | "INSURANCE";

function patientName(bill: InvoiceRecord) {
  if (bill.patient?.name) return bill.patient.name;
  if (bill.patient?.firstName) {
    return `${bill.patient.firstName} ${bill.patient.lastName || ""}`.trim();
  }
  return "Unknown patient";
}

function balanceDue(bill: InvoiceRecord) {
  return Math.max(
    0,
    bill.totalAmount -
      (bill.insuranceCoverage || 0) -
      Math.max(bill.paidAmount || 0, bill.appointment?.paidAmount || 0),
  );
}

export function CounterPanel() {
  const [bills, setBills] = useState<InvoiceRecord[]>([]);
  const [paid, setPaid] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<PayMode>("UPI");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [isFetching, setIsFetching] = useState(true);

  const loadBills = useCallback(async () => {
    try {
      const res = await fetchPendingBillsApi();
      if (res.status === "success") {
        setBills(res.data.invoices);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadBills();
    const socket = getSocket();
    if (!socket) return;
    const handleUpdate = () => void loadBills();
    socket.on("invoice_updated", handleUpdate);
    socket.on("invoice_created", handleUpdate);
    socket.on("reception:bill_paid", handleUpdate);
    return () => {
      socket.off("invoice_updated", handleUpdate);
      socket.off("invoice_created", handleUpdate);
      socket.off("reception:bill_paid", handleUpdate);
    };
  }, [loadBills]);

  const handlePay = async (id: string) => {
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await payBillApi(id, mode);
      if (res.status === "success") {
        toast.success("Payment recorded");
        setPaid((prev) => ({ ...prev, [id]: mode }));
        setTimeout(() => void loadBills(), 1200);
      }
    } catch {
      toast.error("Could not process payment");
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const pendingTotal = useMemo(
    () =>
      bills.reduce(
        (sum, bill) => (paid[bill._id] ? sum : sum + balanceDue(bill)),
        0,
      ),
    [bills, paid],
  );

  const modes: { id: PayMode; icon: typeof Landmark; label: string }[] = [
    { id: "UPI", icon: Landmark, label: "UPI" },
    { id: "CARD", icon: CreditCard, label: "Card" },
    { id: "CASH", icon: Banknote, label: "Cash" },
    { id: "INSURANCE", icon: Check, label: "TPA" },
  ];

  return (
    <section className="flex h-[calc(100vh-4rem)] min-h-[32rem] flex-col pb-24 lg:pb-0">
      <ReceptionHeader
        title="Front counter"
        note="Collect consultation, lab, and pharmacy balances. Choose the tender, then collect."
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="order-1 shrink-0 border-b border-border/60 bg-card/20 lg:order-2 lg:w-72 lg:border-b-0 lg:border-l">
          <div className="p-4 sm:p-5">
            <h3 className="mono-label mb-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Tender
            </h3>
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
              {modes.map((m) => {
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <m.icon className="size-4" />
                    <span className="text-[11px] font-bold tracking-wide">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden border-t border-border/60 p-4 sm:p-5 lg:block">
            <h3 className="mono-label mb-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              On this counter
            </h3>
            <p className="font-mono text-3xl font-bold tracking-tight text-foreground">
              ₹{pendingTotal.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {bills.filter((b) => !paid[b._id]).length} unpaid invoice
              {bills.filter((b) => !paid[b._id]).length === 1 ? "" : "s"}
            </p>
          </div>
        </aside>

        <div className="order-2 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:order-1 lg:p-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="mono-label text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Pending
            </h2>
            <p className="font-mono text-xs text-muted-foreground lg:hidden">
              Due ₹{pendingTotal.toLocaleString("en-IN")}
            </p>
          </div>

          {isFetching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : bills.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center border border-dashed border-border/60 bg-muted/20 px-4 text-center">
              <Check className="mb-2 size-6 text-success/60" />
              <p className="font-medium text-foreground">Queue is clear</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No pending invoices.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {bills.map((b) => {
                const net = balanceDue(b);
                const isPaid = paid[b._id];
                const isLoading = loading[b._id];
                const items =
                  b.items?.map((i) => i.description).join(", ") ||
                  "Consultation";

                return (
                  <li
                    key={b._id}
                    className={`border ${
                      isPaid
                        ? "border-success/20 bg-success/5"
                        : "border-border/60 bg-card/50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center font-mono text-[10px] font-bold ${
                            isPaid
                              ? "bg-success/20 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {(b.invoiceNumber || b._id).slice(-4).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {patientName(b)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {b.patient?.phone || "No phone"} · {items}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-3 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="mono-label text-[10px] tracking-wider text-muted-foreground uppercase">
                            Due
                          </p>
                          <div className="mt-0.5 flex items-baseline gap-2">
                            <span
                              className={`font-mono text-lg font-bold tracking-tight ${
                                isPaid ? "text-success" : "text-foreground"
                              }`}
                            >
                              ₹{net}
                            </span>
                            {b.insuranceCoverage ? (
                              <span className="text-xs text-muted-foreground line-through">
                                ₹{b.totalAmount}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {isPaid ? (
                          <div className="inline-flex items-center gap-1.5 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                            <Check className="size-3.5" /> {isPaid}
                          </div>
                        ) : (
                          <ActionButton
                            disabled={isLoading}
                            tone="solid"
                            onClick={() => void handlePay(b._id)}
                            className="px-4"
                          >
                            {isLoading ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              `Collect ₹${net}`
                            )}
                          </ActionButton>
                        )}
                      </div>
                    </div>

                    {b.payer === "insurance" && !isPaid ? (
                      <div className="flex items-center gap-2 border-t border-border/40 bg-muted/30 px-4 py-2">
                        <AlertCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          TPA coverage ₹{b.insuranceCoverage}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
