"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TestTube, PhoneCall, Check, X, Barcode, TriangleAlert } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchLabCollectionsApi, markLabCollectedApi } from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";



/** Animated tube-rack glyph — hand-drawn SVG, no raster assets. */
function RackGlyph({ tubes }: { tubes: { colour: string; count: number }[] }) {
  const flat = tubes.flatMap((t) => Array.from({ length: t.count }, () => t.colour)).slice(0, 8);
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full">
      <line x1="4" y1="42" x2="116" y2="42" stroke="var(--hairline)" strokeWidth="1" />
      {flat.map((c, i) => (
        <g key={i}>
          <rect x={8 + i * 13} y="10" width="8" height="30" fill="none" stroke="var(--hairline)" />
          <motion.rect
            x={8 + i * 13}
            width="8"
            fill={c}
            opacity="0.7"
            initial={{ y: 40, height: 0 }}
            animate={{ y: 24, height: 16 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
          />
        </g>
      ))}
    </svg>
  );
}


/* ---------- 01 collection ---------- */

export function CollectionPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCollections = async () => {
    try {
      const res = await fetchLabCollectionsApi();
      if (res.success) {
        setRows(res.collections);
      }
    } catch (e) {
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
    const socket = getSocket();
    if (socket) {
      socket.on("lab_collection_updated", loadCollections);
      socket.on("order_created", loadCollections);
      return () => {
        socket.off("lab_collection_updated", loadCollections);
        socket.off("order_created", loadCollections);
      };
    }
  }, []);

  const handleMarkCollected = async (id: string) => {
    try {
      const res = await markLabCollectedApi(id);
      if (res.success) {
        toast.success("Marked as collected");
        loadCollections();
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  return (
    <section>
      <PanelHeader
        index="01 / phlebotomy"
        title="Sample collection"
        note="Collection round by location with the exact tube set, fasting requirement and priority. Print labels at the bedside."
        actions={<ActionButton tone="solid">Print round labels</ActionButton>}
      />

      <div className="hairline-t grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {loading ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-2">Loading collections...</div>
        ) : rows.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-2">No collections pending.</div>
        ) : rows.map((c) => {
          const patientName = c.patient?.name || "Unknown Patient";
          const patientMrn = c.patient?.mrn || c.patient?._id?.slice(-6) || "N/A";
          
          return (
          <div key={c._id} className="bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mono-label text-accent/80">{c.accessionNumber || c._id.slice(-8)}</p>
                <p className="mt-1 font-mono text-lg font-bold">{patientName}</p>
                <p className="mono-label text-muted-foreground">{patientMrn}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Pill tone={c.priority === "STAT" ? "bad" : c.priority === "URGENT" ? "warn" : "mute"}>
                  {c.priority}
                </Pill>
              </div>
            </div>

            <p className="mt-3 text-sm">{c.testName}</p>

            <div className="mt-3">
              <RackGlyph tubes={[{ colour: "var(--color-accent)", count: c.items.length }]} />
              <div className="mono-label text-muted-foreground flex flex-wrap gap-3">
                <span>1 × Standard Tube</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                tone="solid"
                onClick={() => handleMarkCollected(c._id)}
                disabled={c.status === "IN_PROGRESS"}
              >
                {c.status === "IN_PROGRESS" ? "Collected ✓" : "Mark collected"}
              </ActionButton>
              <ActionButton>
                <Barcode className="mr-1 inline size-3" /> Scan tube
              </ActionButton>
            </div>
          </div>
        )})}
      </div>
    </section>
  );
}
