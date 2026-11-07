"use client";

/* Hallmark · macrostructure: Catalogue · tone: utilitarian · anchor hue: emerald
 * theme: Emerald Prestige (locked)
 * pre-emit: P5 H5 E4 S5 R5 V4
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
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

function stateLabel(state: QueueFilter) {
  if (state === "READY") return "Ready";
  if (state === "AWAITING_PAYMENT") return "Payment";
  return "Invoice";
}

function money(value: number) {
  return `₹${value.toFixed(2)}`;
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
    <section className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col overflow-x-clip">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Today&apos;s scripts.
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {rows.length} open · {needsBillCount} to invoice · {waitingCount}{" "}
            unpaid · {readyCount} ready
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

      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search pharmacy queue</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Patient, doctor, or ID"
            className="h-10 w-full border border-border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div
          className="grid grid-cols-4 gap-px bg-border"
          role="group"
          aria-label="Filter prescriptions"
        >
          {(
            [
              ["ALL", "All"],
              ["NEEDS_BILL", "Invoice"],
              ["AWAITING_PAYMENT", "Payment"],
              ["READY", "Ready"],
            ] as [QueueFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setQueueFilter(value)}
              aria-pressed={queueFilter === value}
              className={`h-10 truncate px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                queueFilter === value
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          Loading scripts
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className={selected ? "hidden lg:block" : "block"}>
            {filtered.length ? (
              <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((row) => {
                  const state = getQueueState(row);
                  const openCount = row.medicines.filter(
                    (item) => !item.isDispensed,
                  ).length;
                  const active = selected?._id === row._id;
                  return (
                    <li key={row._id} className="min-w-0 bg-background">
                      <button
                        type="button"
                        onClick={() => selectPrescription(row)}
                        aria-pressed={active}
                        className={`flex h-full min-h-28 w-full flex-col items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                          active ? "bg-accent/10" : "hover:bg-foreground/3"
                        }`}
                      >
                        <span className="flex w-full min-w-0 items-baseline justify-between gap-3">
                          <span className="truncate font-display text-lg font-semibold tracking-tight">
                            {row.patient?.name || "Patient"}
                          </span>
                          <span
                            className={`mono-label shrink-0 ${
                              state === "READY"
                                ? "text-primary"
                                : state === "AWAITING_PAYMENT"
                                  ? "text-accent"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {stateLabel(state)}
                          </span>
                        </span>
                        <span className="truncate text-sm text-muted-foreground">
                          Dr. {row.doctor?.name || "—"}
                        </span>
                        <span className="mt-auto flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">{openCount} open</span>
                          <span>
                            {new Date(row.createdAt).toLocaleDateString()}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-16 text-center sm:px-6">
                <p className="font-display text-xl font-semibold">
                  No scripts in this view.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Change the filter or clear the search.
                </p>
                {(search || queueFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setQueueFilter("ALL");
                    }}
                    className="mt-4 h-10 border border-border px-3 text-sm font-medium hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {selected ? (
            <article className="border-t border-border">
              <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="mb-3 inline-flex h-9 items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                  >
                    <ArrowLeft className="size-4" />
                    Queue
                  </button>
                  <h2 className="truncate font-display text-2xl font-bold tracking-tight">
                    {selected.patient?.name || "Patient"}
                  </h2>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>Dr. {selected.doctor?.name || "—"}</span>
                    <span>
                      {new Date(selected.createdAt).toLocaleDateString()}
                    </span>
                    {selected.patient?.phone ? (
                      <a
                        className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={`tel:${selected.patient.phone}`}
                      >
                        {selected.patient.phone}
                      </a>
                    ) : null}
                  </p>
                </div>
                {selected.sale ? (
                  <p className="mono-label shrink-0 text-muted-foreground">
                    {selected.sale.invoice?._id?.slice(-8).toUpperCase() || "—"}
                  </p>
                ) : null}
              </div>

              {selected.sale ? (
                <SaleSheet
                  selected={selected}
                  working={working}
                  onRefresh={() => void load()}
                  onDispense={(cash) => void dispense(cash)}
                />
              ) : (
                <BillSheet
                  catalog={catalog}
                  lines={lines}
                  total={total}
                  working={working}
                  otcItemId={otcItemId}
                  onOtcChange={setOtcItemId}
                  onAddOtc={addOtcItem}
                  onInventory={setInventory}
                  onQuantity={setQuantity}
                  onRemove={removeOtcItem}
                  onSend={() => void sendBill()}
                />
              )}
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SaleSheet({
  selected,
  working,
  onRefresh,
  onDispense,
}: {
  selected: PendingPrescriptionRecord;
  working: boolean;
  onRefresh: () => void;
  onDispense: (cash: boolean) => void;
}) {
  const sale = selected.sale;
  if (!sale) return null;
  const paid = sale.invoice?.status === "PAID";
  const partial = sale.invoice?.status === "PARTIAL";

  return (
    <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0 border-t border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h3 className="text-sm font-semibold">Reserved stock</h3>
          <span className="mono-label text-muted-foreground">
            {sale.invoice?.status || "PENDING"}
          </span>
        </div>
        <ul className="border-t border-border">
          {sale.items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border px-4 py-3 text-sm sm:px-6"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.quantity} × {money(item.unitPrice)}
                </span>
              </span>
              <span className="tabular-nums">{money(item.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between px-4 py-4 sm:px-6">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {money(sale.totalAmount)}
          </span>
        </div>
      </div>
      <aside className="border-t border-border px-4 py-4 sm:px-6 lg:border-t-0 lg:border-l">
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="text-right tabular-nums">
            {money(Number(sale.invoice?.paidAmount || 0))}
          </dd>
          <dt className="text-muted-foreground">Due</dt>
          <dd className="text-right tabular-nums">
            {money(
              Math.max(
                0,
                sale.totalAmount - Number(sale.invoice?.paidAmount || 0),
              ),
            )}
          </dd>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Dispensing deducts reserved stock and records who handed it over.
        </p>
        {partial ? (
          <p className="mt-3 text-xs leading-relaxed text-accent">
            A balance is still open. Take cash only after the rest is in hand.
          </p>
        ) : null}
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            disabled={working}
            onClick={() => onDispense(!paid)}
            className="h-11 bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {working ? "Working" : paid ? "Dispense" : "Take cash"}
          </button>
          <button
            type="button"
            disabled={working}
            onClick={onRefresh}
            className="h-10 border border-border px-3 text-sm hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            Check payment
          </button>
        </div>
      </aside>
    </div>
  );
}

function BillSheet({
  catalog,
  lines,
  total,
  working,
  otcItemId,
  onOtcChange,
  onAddOtc,
  onInventory,
  onQuantity,
  onRemove,
  onSend,
}: {
  catalog: PharmacyCatalogItem[];
  lines: BillLine[];
  total: number;
  working: boolean;
  otcItemId: string;
  onOtcChange: (id: string) => void;
  onAddOtc: () => void;
  onInventory: (key: string, id: string) => void;
  onQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onSend: () => void;
}) {
  const blocked =
    working ||
    !lines.length ||
    lines.some((line) => !line.inventoryItemId) ||
    total <= 0;

  return (
    <div className="grid min-w-0 border-t border-border lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
          <h3 className="text-sm font-semibold">Match to stock</h3>
          <div className="flex min-w-0 flex-1 gap-2 sm:max-w-md sm:ml-auto">
            <select
              value={otcItemId}
              onChange={(event) => onOtcChange(event.target.value)}
              aria-label="Select OTC stock item"
              className="h-10 min-w-0 flex-1 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Add OTC item</option>
              {catalog.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.itemName} · {item.availableStock ?? item.currentStock} ·{" "}
                  {money(item.unitPrice)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!otcItemId}
              onClick={onAddOtc}
              className="inline-flex h-10 shrink-0 items-center gap-1 border border-border px-3 text-sm font-medium hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              <Plus className="size-3.5" />
              Add
            </button>
          </div>
        </div>
        <ul className="border-t border-border">
          {lines.map((line) => {
            const product = catalog.find(
              (item) => item._id === line.inventoryItemId,
            );
            return (
              <li
                key={line.key}
                className="grid gap-3 border-b border-border px-4 py-4 sm:px-6"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.name}</p>
                    {line.detail ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {line.detail}
                      </p>
                    ) : (
                      <p className="mono-label mt-1 text-accent">OTC</p>
                    )}
                  </div>
                  {!line.medicineId ? (
                    <button
                      type="button"
                      onClick={() => onRemove(line.key)}
                      className="flex size-9 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
                <label className="grid gap-1.5 text-xs text-muted-foreground">
                  Stock item
                  <select
                    value={line.inventoryItemId}
                    onChange={(event) =>
                      onInventory(line.key, event.target.value)
                    }
                    className="h-10 w-full min-w-0 border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Choose stocked product</option>
                    {catalog.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.itemName} ·{" "}
                        {item.availableStock ?? item.currentStock} {item.unit} ·{" "}
                        {money(item.unitPrice)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex h-9 items-center border border-border">
                    <button
                      type="button"
                      onClick={() =>
                        onQuantity(line.key, Math.max(1, line.quantity - 1))
                      }
                      disabled={line.quantity <= 1}
                      className="flex size-9 items-center justify-center hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-40"
                      aria-label={`Decrease ${line.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onQuantity(line.key, Math.min(100, line.quantity + 1))
                      }
                      disabled={line.quantity >= 100}
                      className="flex size-9 items-center justify-center hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-40"
                      aria-label={`Increase ${line.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {money((product?.unitPrice || 0) * line.quantity)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="border-t border-border px-4 py-4 sm:px-6 lg:border-t-0 lg:border-l">
        <p className="text-sm text-muted-foreground">{lines.length} lines</p>
        <p className="mt-2 font-display text-3xl font-bold tabular-nums">
          {money(total)}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Prices come from inventory. Stock is reserved when the invoice is
          created.
        </p>
        <button
          type="button"
          disabled={blocked}
          onClick={onSend}
          className="mt-4 h-11 w-full bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {working ? "Sending" : "Send invoice"}
        </button>
        {catalog.length === 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-accent">
            No priced stock. Ask an admin to set unit prices.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
