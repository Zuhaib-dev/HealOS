"use client";

import { useCallback, useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, BedDouble } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";

/* ---------- shared primitives ---------- */

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

import { fetchAdminWardsApi, createWardApi, updateWardApi, deleteWardApi, AdminWardData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- 04 wards ---------- */

export function WardsPanel() {
  const [loading, setLoading] = useState(true);
  const [dbWards, setDbWards] = useState<AdminWardData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<AdminWardData>>({
    name: "", code: "", department: "General Medicine", capacity: 20, currentOccupancy: 0
  });

  const loadWards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminWardsApi();
      if (res.success && res.wards) {
        setDbWards(res.wards);
      }
    } catch (err) {
      console.error("Failed to fetch admin wards", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadWards);
  }, [loadWards]);

  useAdminRealtime(["wards", "patients"], loadWards);

  const handleOpenNew = () => {
    setFormData({ name: "", code: "", department: "General Medicine", capacity: 20, currentOccupancy: 0 });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (ward: AdminWardData) => {
    setFormData(ward);
    setEditingId(ward._id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ward?")) return;
    try {
      await deleteWardApi(id);
      toast.success("Ward deleted successfully");
      loadWards();
    } catch (err) {
      toast.error("Failed to delete ward");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateWardApi(editingId, formData);
        toast.success("Ward updated successfully");
      } else {
        await createWardApi(formData);
        toast.success("Ward created successfully");
      }
      setIsFormOpen(false);
      loadWards();
    } catch (err) {
      toast.error("Failed to save ward");
    }
  };

  return (
    <section>
      <PanelHeader
        index="04 / CAPACITY"
        title="Wards & bed board"
        note="Every bay, its occupancy and headroom — refreshed as porters move patients."
        actions={
          <>
            <ActionButton>Open bed board</ActionButton>
            <ActionButton tone="solid" onClick={handleOpenNew}>
              <span className="flex items-center gap-2"><Plus className="size-3" /> Add Ward</span>
            </ActionButton>
          </>
        }
      />
      
      {isFormOpen && (
        <div className="mx-5 sm:mx-8 mb-8 p-6 bg-card/40 rounded-2xl border border-border/60 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="mono-label font-bold text-foreground">{editingId ? "Edit Ward" : "Add New Ward"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Ward Name</span>
              <input required value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="e.g. ICU" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Ward Code</span>
              <input required value={formData.code} onChange={e => setFormData(d => ({ ...d, code: e.target.value }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="e.g. ICU-1" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Department</span>
              <input required value={formData.department} onChange={e => setFormData(d => ({ ...d, department: e.target.value }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="e.g. Intensive Care" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Capacity</span>
              <input type="number" min={1} required value={formData.capacity} onChange={e => setFormData(d => ({ ...d, capacity: parseInt(e.target.value) || 0 }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </label>
            <label className="block">
              <span className="mono-label text-xs text-muted-foreground block mb-1">Current Occupancy</span>
              <input type="number" min={0} required value={formData.currentOccupancy} onChange={e => setFormData(d => ({ ...d, currentOccupancy: parseInt(e.target.value) || 0 }))} className="border border-border/60 rounded-lg w-full bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </label>
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="mono-label text-muted-foreground px-4 py-2 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="bg-primary text-primary-foreground mono-label rounded-lg px-4 py-2 font-bold hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                {editingId ? "Save Changes" : "Create Ward"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 p-5 sm:p-8">
        {loading ? (
          <div className="p-12 text-center mono-label text-xs text-muted-foreground animate-pulse col-span-full">
            Loading wards data...
          </div>
        ) : dbWards.length > 0 ? (
          dbWards.map((w) => {
            const pct = Math.round(((w.currentOccupancy || 0) / (w.capacity || 1)) * 100);
            const tight = pct >= 85;
            return (
              <div key={w._id} className="bg-card/40 border border-border/60 rounded-2xl p-6 relative group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 backdrop-blur-sm overflow-hidden">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                  <button type="button" onClick={() => handleEdit(w)} className="bg-background/80 backdrop-blur border border-border/60 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(w._id)} className="bg-background/80 backdrop-blur border border-border/60 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shadow-sm">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-start justify-between relative z-0">
                  <div>
                    <p className="font-mono text-lg font-bold pr-16">{w.name}</p>
                    <p className="mono-label text-muted-foreground mt-1">{w.code} · {w.department}</p>
                  </div>
                  <Pill tone={tight ? "bad" : "ok"}>{tight ? "tight" : "ok"}</Pill>
                </div>
                <div className="mt-5 grid grid-cols-8 gap-1">
                  {Array.from({ length: w.capacity }).slice(0, 24).map((_, i) => (
                    <motion.span
                      key={i}
                      className={`h-3 ${i < Math.min(w.currentOccupancy, 24) ? "bg-accent" : "bg-foreground/8"}`}
                      initial={{ opacity: 0.2 }}
                      animate={{ opacity: i < Math.min(w.currentOccupancy, 24) ? [0.55, 1, 0.55] : 0.5 }}
                      transition={{ duration: 3, delay: i * 0.05, repeat: Infinity }}
                    />
                  ))}
                </div>
                <p className="mono-label text-muted-foreground mt-4">
                  {w.currentOccupancy}/{w.capacity} occupied · {w.capacity - w.currentOccupancy} free
                </p>
              </div>
            );
          })
        ) : (
          <div className="p-16 text-center mono-label text-xs text-muted-foreground col-span-full">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                <BedDouble className="size-6 text-muted-foreground/60" />
              </div>
              <p className="mono-label text-muted-foreground">No wards registered in system.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
