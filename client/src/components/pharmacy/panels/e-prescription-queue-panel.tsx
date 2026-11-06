"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pill,
  RefreshCw,
  Search,
  Plus,
  Banknote,
  CreditCard,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  createPharmacyBillApi,
  dispensePharmacySaleApi,
  fetchPendingPrescriptionsApi,
  fetchPharmacyCatalogApi,
  recordPharmacyCashApi,
  type PendingPrescriptionRecord,
  type PharmacyCatalogItem,
} from "@/lib/api/pharmacy";

type BillLine = {
  key: string;
  medicineId?: string;
  name: string;
  detail?: string;
  inventoryItemId: string;
  quantity: number;
};

export function RxQueuePanel() {
  const [rows, setRows] = useState<PendingPrescriptionRecord[]>([]);
  const [catalog, setCatalog] = useState<PharmacyCatalogItem[]>([]);
  const [selected, setSelected] = useState<PendingPrescriptionRecord | null>(
    null,
  );
  const [lines, setLines] = useState<BillLine[]>([]);
  const [search, setSearch] = useState("");
  const [otcItemId, setOtcItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prescriptions, inventory] = await Promise.all([
        fetchPendingPrescriptionsApi(),
        fetchPharmacyCatalogApi(),
      ]);
      setRows(prescriptions.prescriptions);
      setCatalog(inventory.items);
      setSelected((current) =>
        current
          ? prescriptions.prescriptions.find(
              (row) => row._id === current._id,
            ) || null
          : null,
      );
    } catch {
      toast.error("Unable to load the pharmacy queue and stock");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => void load();
    const onInvoicePaid = (event: { invoiceId?: string }) => {
      if (event.invoiceId && selected?.sale?.invoice?._id === event.invoiceId)
        toast.success("Payment confirmed. The sale is ready to dispense.");
      void load();
    };
    socket.on("prescription_created", refresh);
    socket.on("prescription_dispensed", refresh);
    socket.on("inventory_updated", refresh);
    socket.on("invoice_paid", onInvoicePaid);
    return () => {
      socket.off("prescription_created", refresh);
      socket.off("prescription_dispensed", refresh);
      socket.off("inventory_updated", refresh);
      socket.off("invoice_paid", onInvoicePaid);
    };
  }, [load, selected?.sale?.invoice?._id]);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        `${row.patient?.name || ""} ${row.doctor?.name || ""} ${row._id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [rows, search],
  );
  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = catalog.find(
          (item) => item._id === line.inventoryItemId,
        );
        return sum + (product?.unitPrice || 0) * line.quantity;
      }, 0),
    [catalog, lines],
  );

  const selectPrescription = (row: PendingPrescriptionRecord) => {
    setSelected(row);
    if (row.sale) {
      setLines([]);
      return;
    }
    setLines(
      row.medicines
        .filter((medicine) => !medicine.isDispensed)
        .map((medicine) => {
          const match = catalog.find(
            (item) =>
              item.itemName.trim().toLowerCase() ===
              medicine.name.trim().toLowerCase(),
          );
          return {
            key: medicine._id,
            medicineId: medicine._id,
            name: medicine.name,
            detail: `${medicine.dosage} · ${medicine.frequency} · ${medicine.duration}`,
            inventoryItemId: match?._id || "",
            quantity: 1,
          };
        }),
    );
  };

  const setInventory = (key: string, inventoryItemId: string) =>
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, inventoryItemId } : line,
      ),
    );
  const setQuantity = (key: string, quantity: number) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity } : line)),
    );

  const addOtcItem = () => {
    const item = catalog.find((product) => product._id === otcItemId);
    if (!item) return;
    const existing = lines.find(
      (line) => !line.medicineId && line.inventoryItemId === item._id,
    );
    if (existing)
      setQuantity(existing.key, Math.min(100, existing.quantity + 1));
    else
      setLines((current) => [
        ...current,
        {
          key: `otc-${item._id}-${Date.now()}`,
          name: item.itemName,
          inventoryItemId: item._id,
          quantity: 1,
        },
      ]);
    setOtcItemId("");
  };

  const sendBill = async () => {
    if (!selected || selected.sale) return;
    if (!lines.length || lines.some((line) => !line.inventoryItemId))
      return toast.error(
        "Match every prescription medicine to a priced stock item first.",
      );
    const insufficient = lines.find(
      (line) =>
        (catalog.find((item) => item._id === line.inventoryItemId)
          ?.availableStock ??
          catalog.find((item) => item._id === line.inventoryItemId)
            ?.currentStock ??
          0) < line.quantity,
    );
    if (insufficient)
      return toast.error(`Not enough stock for ${insufficient.name}.`);
    setWorking(true);
    try {
      await createPharmacyBillApi(
        selected._id,
        lines.map(({ medicineId, inventoryItemId, quantity }) => ({
          medicineId,
          inventoryItemId,
          quantity,
        })),
      );
      toast.success(
        "Invoice sent to the patient's billing page. Stock is checked again before dispensing.",
      );
      await load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to create the pharmacy bill",
      );
    } finally {
      setWorking(false);
    }
  };

  const dispense = async (cash: boolean) => {
    const sale = selected?.sale;
    if (!sale) return;
    setWorking(true);
    try {
      if (cash) await recordPharmacyCashApi(sale._id);
      await dispensePharmacySaleApi(sale._id);
      toast.success("Payment recorded and stock dispensed.");
      setSelected(null);
      await load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to dispense this sale",
      );
      await load();
    } finally {
      setWorking(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-80 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading pharmacy stock
        and prescriptions…
      </div>
    );

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col">
      <PanelHeader
        index="01 / dispensary"
        title="Pharmacy & POS"
        note="Bills use admin-set stock prices. Dispensing records payment and deducts stock."
        actions={
          <ActionButton onClick={() => void load()}>
            <RefreshCw className="mr-2 size-3" />
            Refresh
          </ActionButton>
        }
      />
      <div className="grid flex-1 gap-0 border-t border-border/60 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <aside className="border-b border-border/60 lg:border-b-0 lg:border-r">
          <div className="border-b border-border/50 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find patient or doctor"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {filtered.length ? (
              filtered.map((row) => (
                <button
                  key={row._id}
                  onClick={() => selectPrescription(row)}
                  className={`mb-2 w-full rounded-xl border p-4 text-left transition-colors ${selected?._id === row._id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-semibold">
                      {row.patient?.name || "Patient"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium">
                      {row.sale
                        ? row.sale.invoice?.status === "PAID"
                          ? "PAID · READY"
                          : "AWAITING PAYMENT"
                        : "NEEDS BILL"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Dr. {row.doctor?.name || "—"} ·{" "}
                    {row.medicines.filter((item) => !item.isDispensed).length}{" "}
                    medicine(s)
                  </span>
                </button>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No completed prescriptions are waiting.
              </p>
            )}
          </div>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {!selected ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center text-muted-foreground">
              <Pill className="mb-3 size-10 opacity-40" />
              <p>Select a prescription to prepare a bill.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Prescription
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {selected.patient?.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dr. {selected.doctor?.name} ·{" "}
                    {new Date(selected.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selected.sale && (
                  <p className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    Invoice{" "}
                    {selected.sale.invoice?._id?.slice(-8).toUpperCase()}
                  </p>
                )}
              </div>
              {selected.sale ? (
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Invoice items</h3>
                    <span className="text-xs text-muted-foreground">
                      {selected.sale.invoice?.status || "PENDING"}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {selected.sale.items.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex justify-between gap-4 py-3 text-sm"
                      >
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>₹{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-semibold">
                    <span>Total</span>
                    <span>₹{selected.sale.totalAmount.toFixed(2)}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Paid ₹
                    {Number(selected.sale.invoice?.paidAmount || 0).toFixed(2)}.
                    Receipt status and payment method are recorded on the
                    patient invoice.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {selected.sale.invoice?.status === "PAID" ? (
                      <ActionButton
                        tone="solid"
                        disabled={working}
                        onClick={() => void dispense(false)}
                      >
                        <PackageCheck className="mr-2 size-4" />
                        {working ? "Processing…" : "Dispense paid order"}
                      </ActionButton>
                    ) : (
                      <ActionButton
                        tone="solid"
                        disabled={working}
                        onClick={() => void dispense(true)}
                      >
                        <Banknote className="mr-2 size-4" />
                        {working ? "Processing…" : "Record cash & dispense"}
                      </ActionButton>
                    )}
                    <ActionButton
                      disabled={working}
                      onClick={() => void load()}
                    >
                      <CreditCard className="mr-2 size-4" />
                      Refresh payment
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">Prescription items</h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={otcItemId}
                        onChange={(event) => setOtcItemId(event.target.value)}
                        className="max-w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Add OTC stock item…</option>
                        {catalog.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.itemName} · ₹{item.unitPrice}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!otcItemId}
                        onClick={addOtcItem}
                        className="rounded-lg border border-border p-2 disabled:opacity-40"
                        aria-label="Add over the counter item"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {lines.map((line) => {
                      const product = catalog.find(
                        (item) => item._id === line.inventoryItemId,
                      );
                      return (
                        <div
                          key={line.key}
                          className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_minmax(220px,1fr)_90px_90px] sm:items-center"
                        >
                          <div>
                            <p className="font-medium">{line.name}</p>
                            {line.detail && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {line.detail}
                              </p>
                            )}
                            {!line.medicineId && (
                              <p className="mt-1 text-[10px] uppercase tracking-wide text-primary">
                                OTC item
                              </p>
                            )}
                          </div>
                          <select
                            value={line.inventoryItemId}
                            onChange={(event) =>
                              setInventory(line.key, event.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Choose stocked product…</option>
                            {catalog.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.itemName} ·{" "}
                                {item.availableStock ?? item.currentStock}{" "}
                                {item.unit} available · ₹{item.unitPrice}
                              </option>
                            ))}
                          </select>
                          <label className="text-xs text-muted-foreground">
                            Quantity
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={line.quantity}
                              onChange={(event) =>
                                setQuantity(
                                  line.key,
                                  Math.max(1, Number(event.target.value)),
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                          </label>
                          <p className="text-sm font-semibold">
                            ₹
                            {(
                              (product?.unitPrice || 0) * line.quantity
                            ).toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total from current inventory prices
                      </p>
                      <p className="text-xl font-semibold">
                        ₹{total.toFixed(2)}
                      </p>
                    </div>
                    <ActionButton
                      tone="solid"
                      disabled={
                        working ||
                        !lines.length ||
                        lines.some((line) => !line.inventoryItemId) ||
                        total <= 0
                      }
                      onClick={() => void sendBill()}
                    >
                      <CreditCard className="mr-2 size-4" />
                      {working ? "Creating invoice…" : "Send patient invoice"}
                    </ActionButton>
                  </div>
                  {catalog.length === 0 && (
                    <p className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
                      No priced stock is available. Ask an admin to add stock
                      and set unit prices before creating a pharmacy bill.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
