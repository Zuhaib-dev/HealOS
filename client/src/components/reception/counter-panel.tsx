"use client";

import { useEffect, useState } from "react";
import { Banknote, CreditCard, Landmark, Check } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Td, Th } from "@/components/workspace/ui";
import { fetchPendingBillsApi, payBillApi } from "@/lib/api/reception";
import { InvoiceRecord } from "@/lib/api/reception";
import { toast } from "sonner";

export function CounterPanel() {
  const [bills, setBills] = useState<InvoiceRecord[]>([]);
  const [paid, setPaid] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"CASH" | "CARD" | "UPI" | "INSURANCE">("UPI");
  const [loading, setLoading] = useState(false);

  const loadBills = async () => {
    try {
      const res = await fetchPendingBillsApi();
      if (res.status === "success") {
        setBills(res.data.invoices);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handlePay = async (id: string) => {
    setLoading(true);
    try {
      const res = await payBillApi(id, mode);
      if (res.status === "success") {
        toast.success("Payment successful!");
        setPaid((prev) => ({ ...prev, [id]: mode }));
        // Delay reload slightly to let user see checkmark
        setTimeout(loadBills, 2000);
      }
    } catch (e) {
      toast.error("Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <PanelHeader
        index="03 / counter"
        title="Cash &amp; billing"
        note="Settle OPD consultations, lab tests and pharmacy bills. Live integration with payer APIs for instant claim adjudication."
      />

      <div className="grid gap-px lg:grid-cols-[1fr_320px]" style={{ background: "var(--hairline)" }}>
        <div className="bg-background overflow-x-auto p-0">
          <table className="w-full min-w-[800px]">
            <thead className="hairline-b">
              <tr>
                <Th>Invoice</Th>
                <Th>Patient</Th>
                <Th>Items</Th>
                <Th>Gross</Th>
                <Th>Coverage</Th>
                <Th>Net due</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No pending bills at the moment.
                  </td>
                </tr>
              )}
              {bills.map((b) => {
                const net = b.totalAmount - (b.insuranceCoverage || 0);
                const isPaid = paid[b._id];
                return (
                  <tr key={b._id} className={`hairline-b ${isPaid ? "bg-accent/5" : "hover:bg-foreground/[0.02]"}`}>
                    <Td>
                      <span className="mono-label">{b._id.slice(-6)}</span>
                    </Td>
                    <Td>
                      <p className="font-medium">{b.patient?.firstName} {b.patient?.lastName}</p>
                      <p className="mono-label text-muted-foreground">{b.patient?.phone}</p>
                    </Td>
                    <Td>
                      <span className="text-muted-foreground">{b.items.map(i => i.description).join(", ")}</span>
                    </Td>
                    <Td>
                      <span className="font-mono">₹{b.totalAmount}</span>
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">
                        {b.payer === "insurance" ? `TPA: ₹${b.insuranceCoverage}` : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-base font-bold text-brass">₹{net}</span>
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        {isPaid ? (
                          <span className="mono-label flex items-center gap-1 text-brass">
                            <Check className="size-3" />
                            Paid via {isPaid}
                          </span>
                        ) : (
                          <ActionButton disabled={loading} tone="solid" onClick={() => handlePay(b._id)}>
                            Collect ₹{net}
                          </ActionButton>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Payment mode</p>
          <div className="mt-4 flex flex-col gap-2">
            {[
              { id: "UPI", icon: Landmark, label: "UPI fast tag" },
              { id: "CARD", icon: CreditCard, label: "Card terminal" },
              { id: "CASH", icon: Banknote, label: "Cash drawer" },
              { id: "INSURANCE", icon: Check, label: "Direct Billing / TPA" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  mode === m.id ? "bg-foreground text-background" : "hairline hover:bg-foreground/[0.02]"
                }`}
              >
                <m.icon className="size-4" />
                <span className="font-medium">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="hairline mt-6 p-4">
            <p className="mono-label text-muted-foreground">Float status</p>
            <p className="mt-2 font-mono text-2xl">₹12,400</p>
            <p className="text-muted-foreground mt-1 text-sm">Target float: ₹15,000</p>
            <ActionButton className="mt-4 w-full justify-center">End shift &amp; reconcile</ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}
