import { useCallback, useState, useEffect } from "react";
import { motion } from "motion/react";
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

import { fetchAdminWardsApi, AdminWardData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- 04 wards ---------- */

export function WardsPanel() {
  const [loading, setLoading] = useState(true);
  const [dbWards, setDbWards] = useState<AdminWardData[]>([]);

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

  return (
    <section>
      <PanelHeader
        index="04 / CAPACITY"
        title="Wards & bed board"
        note="Every bay, its occupancy and headroom — refreshed as porters move patients."
        actions={<ActionButton>Open bed board</ActionButton>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse col-span-full">
            Loading wards data from database...
          </div>
        ) : dbWards.length > 0 ? (
          dbWards.map((w) => {
            const pct = Math.round(((w.currentOccupancy || 0) / (w.capacity || 1)) * 100);
            const tight = pct >= 85;
            return (
              <div key={w._id} className="hairline-b hairline-l px-5 py-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-lg font-bold">{w.name}</p>
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
          <div className="p-8 text-center mono-label text-xs text-muted-foreground col-span-full">
            No wards registered in system.
          </div>
        )}
      </div>
    </section>
  );
}
