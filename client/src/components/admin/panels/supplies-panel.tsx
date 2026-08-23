"use client";

import { useCallback, useState, useEffect } from "react";
import { TriangleAlert, Plus, Pencil, Trash2, X, Boxes } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, PanelHeader } from "../admin-shell";

/* ---------- shared primitives ---------- */

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


import { fetchAdminInventoryApi, createInventoryItemApi, updateInventoryItemApi, deleteInventoryItemApi, AdminInventoryData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- 06 supplies ---------- */

export function SuppliesPanel() {
  const [loading, setLoading] = useState(true);
  const [dbInventory, setDbInventory] = useState<AdminInventoryData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<AdminInventoryData>>({
    itemName: "", itemCode: "", category: "General", currentStock: 0, reorderThreshold: 10, unit: "units"
  });

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminInventoryApi();
      if (res.success && res.inventory) {
        setDbInventory(res.inventory);
      }
    } catch (err) {
      console.error("Failed to fetch admin inventory", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadInventory);
  }, [loadInventory]);

  useAdminRealtime(["inventory", "supplies"], loadInventory);

  const handleOpenNew = () => {
    setFormData({ itemName: "", itemCode: "", category: "General", currentStock: 0, reorderThreshold: 10, unit: "units" });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: AdminInventoryData) => {
    setFormData(item);
    setEditingId(item._id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      await deleteInventoryItemApi(id);
      toast.success("Inventory item deleted successfully");
      loadInventory();
    } catch (err) {
      toast.error("Failed to delete inventory item");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateInventoryItemApi(editingId, formData);
        toast.success("Inventory item updated successfully");
      } else {
        await createInventoryItemApi(formData);
        toast.success("Inventory item created successfully");
      }
      setIsFormOpen(false);
      loadInventory();
    } catch (err) {
      toast.error("Failed to save inventory item");
    }
  };

  return (
    <section>
      <PanelHeader
        index="06 / SUPPLY"
        title="Pharmacy & stores"
        note="Consumption against reorder thresholds for controlled and critical stock."
        actions={
          <>
            <ActionButton>Create purchase order</ActionButton>
            <ActionButton tone="solid" onClick={handleOpenNew}>
              <span className="flex items-center gap-2"><Plus className="size-3" /> Add Item</span>
            </ActionButton>
          </>
        }
      />
      
      {isFormOpen && (
        <div className="mx-5 sm:mx-8 mb-8 p-6 bg-card/40 rounded-2xl border border-border/60 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="mono-label font-bold text-foreground">{editingId ? "Edit Inventory Item" : "Add New Item"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <label className="block lg:col-span-2">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Item Name</span>
              <input required value={formData.itemName} onChange={e => setFormData(d => ({ ...d, itemName: e.target.value }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="e.g. Paracetamol" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Item Code</span>
              <input required value={formData.itemCode} onChange={e => setFormData(d => ({ ...d, itemCode: e.target.value }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="e.g. MED-001" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Category</span>
              <input required value={formData.category} onChange={e => setFormData(d => ({ ...d, category: e.target.value }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="e.g. Pharmacy" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Unit</span>
              <input required value={formData.unit} onChange={e => setFormData(d => ({ ...d, unit: e.target.value }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="e.g. strips" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Current Stock</span>
              <input type="number" min={0} required value={formData.currentStock} onChange={e => setFormData(d => ({ ...d, currentStock: parseInt(e.target.value) || 0 }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Reorder At</span>
              <input type="number" min={0} required value={formData.reorderThreshold} onChange={e => setFormData(d => ({ ...d, reorderThreshold: parseInt(e.target.value) || 0 }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </label>
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-3 mt-2 lg:col-start-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="mono-label text-muted-foreground px-4 py-2 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="bg-primary text-primary-foreground mono-label rounded-lg px-4 py-2 font-bold hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                {editingId ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Item</Th>
            <Th>Code</Th>
            <Th>On hand</Th>
            <Th>Reorder at</Th>
            <Th>Signal</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="p-12 text-center mono-label text-xs text-muted-foreground animate-pulse">
                Loading inventory data...
              </td>
            </tr>
          ) : dbInventory.length > 0 ? (
            dbInventory.map((s) => {
              const low = s.currentStock < s.reorderThreshold;
              return (
                <tr key={s._id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                  <Td>
                    <span className="font-medium group-hover:text-primary transition-colors">{s.itemName}</span>
                    <span className="text-muted-foreground text-xs block mt-0.5">{s.category}</span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">{s.itemCode}</span>
                  </Td>
                  <Td>
                    <span className="font-mono font-bold">{s.currentStock}</span>{" "}
                    <span className="mono-label text-muted-foreground">{s.unit}</span>
                  </Td>
                  <Td>
                    <span className="mono-label text-muted-foreground">
                      {s.reorderThreshold} {s.unit}
                    </span>
                  </Td>
                  <Td>
                    {low ? (
                      <span className="mono-label text-destructive flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 shadow-[0_0_8px_color-mix(in_oklab,var(--color-destructive)_15%,transparent)]">
                        <TriangleAlert className="size-3" /> reorder
                      </span>
                    ) : (
                      <Pill tone="ok">healthy</Pill>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(s)} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 p-1.5 rounded-lg transition-colors">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDelete(s._id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="p-16 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                    <Boxes className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="mono-label text-muted-foreground">No inventory items registered.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </TablePanel>
    </section>
  );
}
