"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Pill,
  RefreshCw,
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  PackageCheck,
  Clock3,
  CheckCircle2,
  Phone,
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

type QueueFilter = "ALL" | "NEEDS_BILL" | "AWAITING_PAYMENT" | "READY";

function getQueueState(row: PendingPrescriptionRecord): QueueFilter {
  if (!row.sale) return "NEEDS_BILL";
  return row.sale.invoice?.status === "PAID" ? "READY" : "AWAITING_PAYMENT";
}

export function RxQueuePanel() {
  const [rows, setRows] = useState<PendingPrescriptionRecord[]>([]);
  const [catalog, setCatalog] = useState<PharmacyCatalogItem[]>([]);
  const [selected, setSelected] = useState<PendingPrescriptionRecord | null>(
    null,
  );
  const [lines, setLines] = useState<BillLine[]>([]);
  const [search, setSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL");
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
      rows.filter((row) => {
        const matchesSearch =
          `${row.patient?.name || ""} ${row.doctor?.name || ""} ${row._id}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return (
          matchesSearch &&
          (queueFilter === "ALL" || getQueueState(row) === queueFilter)
        );
      }),
    [rows, search, queueFilter],
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
  const removeOtcItem = (key: string) =>
    setLines((current) => current.filter((line) => line.key !== key));

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
      <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-3 size-5 animate-spin text-primary" /> Loading
        dispensary queue…
      </div>
    );

  const needsBillCount = rows.filter(
    (row) => getQueueState(row) === "NEEDS_BILL",
  ).length;
  const waitingCount = rows.filter(
    (row) => getQueueState(row) === "AWAITING_PAYMENT",
  ).length;
  const readyCount = rows.filter(
    (row) => getQueueState(row) === "READY",
  ).length;

  return (
    <section className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col">
      <PanelHeader
        index="01 / dispensary"
        title="Dispensary"
        note="Prepare an invoice, verify payment, then dispense against live stock."
        actions={
          <ActionButton
            className="min-h-10 rounded-lg border border-border bg-background px-3"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-2 size-3" />
            Refresh queue
          </ActionButton>
        }
      />
      <div className="grid gap-4 border-t border-border/60 bg-muted/20 p-3 sm:p-5 xl:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              In queue
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {rows.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Needs invoice
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {needsBillCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Awaiting payment
            </p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums">
              <Clock3 className="size-4 text-amber-600" />
              {waitingCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Ready to dispense
            </p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums">
              <CheckCircle2 className="size-4 text-emerald-600" />
              {readyCount}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-0 overflow-hidden rounded-2xl border border-border bg-background shadow-sm lg:min-h-[620px] lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <aside
            className={`${selected ? "hidden" : "flex"} min-w-0 flex-col border-b border-border lg:flex lg:border-b-0 lg:border-r`}
          >
            <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input
                  aria-label="Search pharmacy queue"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Patient, doctor, or ID"
                  className="min-h-11 w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div
                className="flex gap-1 overflow-x-auto pb-0.5"
                role="group"
                aria-label="Filter prescriptions"
              >
                {(
                  [
                    ["ALL", "All"],
                    ["NEEDS_BILL", "Needs invoice"],
                    ["AWAITING_PAYMENT", "Payment"],
                    ["READY", "Ready"],
                  ] as [QueueFilter, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQueueFilter(value)}
                    aria-pressed={queueFilter === value}
                    className={`min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${queueFilter === value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-24 flex-1 overflow-y-auto p-2 sm:p-3 lg:max-h-[min(70vh,760px)]">
              {filtered.length ? (
                filtered.map((row) => (
                  <button
                    key={row._id}
                    onClick={() => selectPrescription(row)}
                    className={`mb-2 w-full rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?._id === row._id ? "border-primary/50 bg-primary/5" : "border-transparent bg-card hover:border-border hover:bg-muted/40"}`}
                  >
                    <span className="flex min-w-0 items-start justify-between gap-3">
                      <span className="flex min-w-0 items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(row.patient?.name || "P").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {row.patient?.name || "Patient"}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            Dr. {row.doctor?.name || "—"}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${getQueueState(row) === "READY" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : getQueueState(row) === "AWAITING_PAYMENT" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}
                      >
                        {getQueueState(row) === "READY"
                          ? "Ready"
                          : getQueueState(row) === "AWAITING_PAYMENT"
                            ? "Payment"
                            : "Invoice"}
                      </span>
                    </span>
                    <span className="mt-3 flex items-center justify-between gap-2 pl-12 text-[11px] text-muted-foreground">
                      <span>
                        {
                          row.medicines.filter((item) => !item.isDispensed)
                            .length
                        }{" "}
                        prescribed item(s)
                      </span>
                      <span>
                        {new Date(row.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-5 py-12 text-center">
                  <Pill className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No prescriptions here</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try another filter or clear your search.
                  </p>
                  {(search || queueFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setQueueFilter("ALL");
                      }}
                      className="mt-3 text-xs font-semibold text-primary"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
          <main className={`${selected ? "block" : "hidden"} min-w-0 lg:block`}>
            {!selected ? (
              <div className="hidden h-full min-h-[620px] flex-col items-center justify-center text-center lg:flex">
                <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Pill className="size-6" />
                </span>
                <p className="font-semibold">Choose a prescription</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Review the clinician’s order, prepare a stock-priced invoice,
                  then dispense after payment clears.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-6xl p-3 pb-6 sm:p-5 lg:p-6">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                >
                  <ArrowLeft className="size-4" />
                  Back to queue
                </button>
                <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                      {(selected.patient?.name || "P")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Patient prescription
                      </p>
                      <h2 className="mt-0.5 truncate text-xl font-semibold sm:text-2xl">
                        {selected.patient?.name || "Patient"}
                      </h2>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Dr. {selected.doctor?.name || "—"}</span>
                        <span>
                          {new Date(selected.createdAt).toLocaleDateString()}
                        </span>
                        {selected.patient?.phone && (
                          <a
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            href={`tel:${selected.patient.phone}`}
                          >
                            <Phone className="size-3" />
                            {selected.patient.phone}
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                  {selected.sale && (
                    <span className="max-w-full truncate rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium">
                      Invoice{" "}
                      {selected.sale.invoice?._id?.slice(-8).toUpperCase() ||
                        "—"}
                    </span>
                  )}
                </div>
                {selected.sale ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Invoice items</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reserved from pharmacy stock
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${selected.sale.invoice?.status === "PAID" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
                        >
                          {selected.sale.invoice?.status || "PENDING"}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {selected.sale.items.map((item, index) => (
                          <div
                            key={`${item.name}-${index}`}
                            className="flex min-w-0 items-center justify-between gap-3 py-3 text-sm"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {item.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Qty {item.quantity} × ₹
                                {item.unitPrice.toFixed(2)}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">
                              ₹{item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between border-t border-border pt-4 text-base font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">
                          ₹{selected.sale.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </section>
                    <aside className="h-fit rounded-xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Payment and handoff
                      </p>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">
                            Invoice status
                          </span>
                          <span className="font-medium">
                            {selected.sale.invoice?.status || "PENDING"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">
                            Paid so far
                          </span>
                          <span className="font-medium tabular-nums">
                            ₹
                            {Number(
                              selected.sale.invoice?.paidAmount || 0,
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                        Dispensing deducts the reserved quantity from stock and
                        records the staff member handling it.
                      </p>
                      <div className="mt-4 grid gap-2">
                        {selected.sale.invoice?.status === "PAID" ? (
                          <ActionButton
                            tone="solid"
                            disabled={working}
                            className="min-h-11 w-full justify-center rounded-lg px-3"
                            onClick={() => void dispense(false)}
                          >
                            <PackageCheck className="mr-2 size-4" />
                            {working ? "Dispensing…" : "Dispense order"}
                          </ActionButton>
                        ) : (
                          <ActionButton
                            tone="solid"
                            disabled={working}
                            className="min-h-11 w-full justify-center rounded-lg px-3"
                            onClick={() => void dispense(true)}
                          >
                            <Banknote className="mr-2 size-4" />
                            {working
                              ? "Recording…"
                              : selected.sale.invoice?.status === "PARTIAL"
                                ? "Record cash balance"
                                : "Record cash & dispense"}
                          </ActionButton>
                        )}
                        <ActionButton
                          disabled={working}
                          className="min-h-10 w-full justify-center rounded-lg border border-border px-3"
                          onClick={() => void load()}
                        >
                          <CreditCard className="mr-2 size-4" />
                          Refresh invoice status
                        </ActionButton>
                      </div>
                      {selected.sale.invoice?.status === "PARTIAL" && (
                        <p className="mt-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                          The invoice has a balance remaining. Record cash only
                          after receiving the outstanding amount.
                        </p>
                      )}
                    </aside>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Prescription items</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Match each medicine to a priced stock item.
                          </p>
                        </div>
                        <div className="flex w-full gap-2 sm:w-auto">
                          <select
                            value={otcItemId}
                            onChange={(event) =>
                              setOtcItemId(event.target.value)
                            }
                            aria-label="Select OTC stock item"
                            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm sm:max-w-56"
                          >
                            <option value="">Add OTC stock item…</option>
                            {catalog.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.itemName} ·{" "}
                                {item.availableStock ?? item.currentStock}{" "}
                                available · ₹{item.unitPrice}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!otcItemId}
                            onClick={addOtcItem}
                            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-40"
                            aria-label="Add over the counter item"
                          >
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">Add</span>
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
                              className="grid min-w-0 gap-3 rounded-xl border border-border/80 bg-background p-3 sm:p-4"
                            >
                              <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Pill className="size-3.5" />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                      {line.name}
                                    </p>
                                    {line.detail && (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {line.detail}
                                      </p>
                                    )}
                                    {!line.medicineId && (
                                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                        Over-the-counter
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {!line.medicineId && (
                                  <button
                                    type="button"
                                    onClick={() => removeOtcItem(line.key)}
                                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`Remove ${line.name}`}
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                )}
                              </div>
                              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground sm:grid-cols-[100px_minmax(0,1fr)] sm:items-center">
                                <span>Stock item</span>
                                <select
                                  value={line.inventoryItemId}
                                  onChange={(event) =>
                                    setInventory(line.key, event.target.value)
                                  }
                                  className="min-h-10 min-w-0 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <option value="">
                                    Choose stocked product…
                                  </option>
                                  {catalog.map((item) => (
                                    <option key={item._id} value={item._id}>
                                      {item.itemName} ·{" "}
                                      {item.availableStock ?? item.currentStock}{" "}
                                      {item.unit} · ₹{item.unitPrice}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    Qty
                                  </span>
                                  <div className="flex h-9 items-center rounded-lg border border-border bg-card">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setQuantity(
                                          line.key,
                                          Math.max(1, line.quantity - 1),
                                        )
                                      }
                                      disabled={line.quantity <= 1}
                                      className="flex size-9 items-center justify-center rounded-l-lg hover:bg-muted disabled:opacity-40"
                                      aria-label={`Decrease ${line.name} quantity`}
                                    >
                                      <Minus className="size-3.5" />
                                    </button>
                                    <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                                      {line.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setQuantity(
                                          line.key,
                                          Math.min(100, line.quantity + 1),
                                        )
                                      }
                                      disabled={line.quantity >= 100}
                                      className="flex size-9 items-center justify-center rounded-r-lg hover:bg-muted disabled:opacity-40"
                                      aria-label={`Increase ${line.name} quantity`}
                                    >
                                      <Plus className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Line total
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                                    ₹
                                    {(
                                      (product?.unitPrice || 0) * line.quantity
                                    ).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                    <aside className="h-fit rounded-xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Invoice summary
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          Selected items
                        </span>
                        <span className="font-medium tabular-nums">
                          {lines.length}
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
                        <span className="text-sm text-muted-foreground">
                          Total
                        </span>
                        <span className="text-2xl font-semibold tabular-nums">
                          ₹{total.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        Prices come from Admin inventory. Stock is reserved when
                        the invoice is created.
                      </p>
                      <ActionButton
                        tone="solid"
                        disabled={
                          working ||
                          !lines.length ||
                          lines.some((line) => !line.inventoryItemId) ||
                          total <= 0
                        }
                        className="mt-4 min-h-11 w-full justify-center rounded-lg px-3"
                        onClick={() => void sendBill()}
                      >
                        <CreditCard className="mr-2 size-4" />
                        {working ? "Creating invoice…" : "Send patient invoice"}
                      </ActionButton>
                      {catalog.length === 0 && (
                        <p className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                          No priced stock is available. Ask an admin to add
                          stock and set unit prices.
                        </p>
                      )}
                    </aside>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
