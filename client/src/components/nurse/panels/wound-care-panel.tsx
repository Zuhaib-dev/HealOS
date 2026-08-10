"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Droplets, Bandage, Bell } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, Sparkline, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchWoundsApi, type Wound } from "@/lib/api/nurse";
import { toast } from "sonner";


/* ---------- 04 wound care (real data) ---------- */

export function WoundCarePanel() {
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchWoundsApi()
      .then((data) => {
        setWounds(data.wounds);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load wound care records");
        setLoading(false);
      });
  }, []);
  return (
    <section>
      <PanelHeader
        index="04 / tissue viability"
        title="Wound care"
        note="Every open wound with stage, measured size trend, dressing regimen and the next change due."
        actions={<ActionButton tone="solid">New wound assessment</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground col-span-3">Loading wound care records...</div>
        ) : wounds.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground col-span-3">No wound care records found.</div>
        ) : wounds.map((w) => (
          <div key={`${w.bed}-${w.site}`} className="bg-background p-5">
            <p className="mono-label text-accent/80">{w.bed}</p>
            <p className="mt-1 font-mono text-lg font-bold">{w.patient}</p>
            <p className="mono-label text-muted-foreground">{w.site} · {w.type}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="warn">{w.stage}</Pill>
              <Pill tone={w.exudate === "high" ? "bad" : "mute"}>exudate {w.exudate}</Pill>
              <Pill tone="mute">{w.size}</Pill>
            </div>

            <div className="mt-4">
              <Sparkline values={w.healing} tone={w.overdue ? "bad" : "accent"} />
              <p className="mono-label text-muted-foreground">surface area trend (cm²)</p>
            </div>

            <dl className="mono-label mt-4 space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Dressing</dt><dd>{w.dressing}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Last change</dt><dd>{w.lastChange}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Next change</dt><dd className={w.overdue ? "text-destructive" : ""}>{w.nextChange}</dd></div>
            </dl>

            <p className="text-muted-foreground mt-3 text-sm">{w.photoNote}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton tone="solid" onClick={() => setDone((d) => ({ ...d, [w.site]: true }))}>
                {done[w.site] ? "Change logged ✓" : "Log dressing change"}
              </ActionButton>
              <ActionButton>
                <Bandage className="mr-1 inline size-3" /> Photo
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
