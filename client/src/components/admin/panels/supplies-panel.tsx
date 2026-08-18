import { useCallback, useState, useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";

/* ---------- shared primitives ---------- */

function Th({ children }: { children: React.ReactNode }) {
  return <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-b overflow-x-auto">
      <table className="w-full min-w-180 border-collapse">{children}</table>
    </div>
  );
}


import { fetchAdminInventoryApi, AdminInventoryData } from "@/lib/api/admin";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- 06 supplies ---------- */

export function SuppliesPanel() {
  const [loading, setLoading] = useState(true);
  const [dbInventory, setDbInventory] = useState<AdminInventoryData[]>([]);

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

  return (
    <section>
      <PanelHeader
        index="06 / SUPPLY"
        title="Pharmacy & stores"
        note="Consumption against reorder thresholds for controlled and critical stock."
        actions={<ActionButton tone="solid">Create purchase order</ActionButton>}
      />
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Item</Th>
            <Th>Code</Th>
            <Th>On hand</Th>
            <Th>Reorder at</Th>
            <Th>Signal</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
                Loading inventory data from database...
              </td>
            </tr>
          ) : dbInventory.length > 0 ? (
            dbInventory.map((s) => {
              const low = s.currentStock < s.reorderThreshold;
              return (
                <tr key={s.itemCode} className="hairline-b">
                  <Td>
                    <span className="font-medium">{s.itemName}</span>
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
                      <span className="mono-label text-destructive flex items-center gap-1.5">
                        <TriangleAlert className="size-3" /> reorder now
                      </span>
                    ) : (
                      <Pill tone="ok">healthy</Pill>
                    )}
                  </Td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="p-8 text-center mono-label text-xs text-muted-foreground">
                No inventory items registered.
              </td>
            </tr>
          )}
        </tbody>
      </TablePanel>
    </section>
  );
}
