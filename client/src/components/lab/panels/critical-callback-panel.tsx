"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  TestTube,
  PhoneCall,
  Check,
  X,
  Barcode,
  TriangleAlert,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  Card,
  LiveDot,
  Pill,
  StatGrid,
  Td,
  Th,
  type Tone,
} from "@/components/workspace/ui";
import {
  fetchLabCriticalValuesApi,
  recordLabCriticalCallbackApi,
} from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

/** Animated tube-rack glyph — hand-drawn SVG, no raster assets. */
function RackGlyph({ tubes }: { tubes: { colour: string; count: number }[] }) {
  const flat = tubes
    .flatMap((t) => Array.from({ length: t.count }, () => t.colour))
    .slice(0, 8);
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full">
      <line
        x1="4"
        y1="42"
        x2="116"
        y2="42"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      {flat.map((c, i) => (
        <g key={i}>
          <rect
            x={8 + i * 13}
            y="10"
            width="8"
            height="30"
            fill="none"
            stroke="var(--hairline)"
          />
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

/* ---------- 05 critical callback ---------- */

export function CriticalPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [callbacks, setCallbacks] = useState<
    Record<string, { clinician: string; confirmed: boolean }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);

  const loadCriticals = async () => {
    try {
      const res = await fetchLabCriticalValuesApi();
      if (res.success) {
        setRows(res.criticalValues);
      }
    } catch (e) {
      toast.error("Failed to load critical values");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCriticals();
    const socket = getSocket();
    if (socket) {
      socket.on("lab_report_validated", loadCriticals);
      socket.on("lab_critical_callback_recorded", loadCriticals);
      return () => {
        socket.off("lab_report_validated", loadCriticals);
        socket.off("lab_critical_callback_recorded", loadCriticals);
      };
    }
  }, []);

  const recordCallback = async (id: string) => {
    const value = callbacks[id];
    if (!value?.clinician.trim() || !value.confirmed) {
      toast.error("Enter the clinician and confirm the read-back first.");
      return;
    }
    setSaving(id);
    try {
      await recordLabCriticalCallbackApi(id, value.clinician.trim(), true);
      toast.success("Critical-result callback recorded.");
      await loadCriticals();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to record callback.",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <section>
      <PanelHeader
        index="05 / closed loop"
        title="Critical-value callback"
        note="Every critical result must be phoned, read back and signed. Open items age visibly until the loop closes."
        actions={
          <ActionButton tone="solid">
            {rows.filter((r) => !r.criticalCallback?.readBackConfirmed).length}{" "}
            open
          </ActionButton>
        }
      />

      <div
        className="grid gap-px lg:grid-cols-3"
        style={{ background: "var(--hairline)" }}
      >
        {loading ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-3">
            Loading critical values...
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-3">
            No pending critical values.
          </div>
        ) : (
          rows.map((c) => {
            const patientName = c.patient?.name || "Unknown Patient";
            const accession =
              c.order?.accessionNumber || c.order?._id?.slice(-8) || "N/A";

            return (
              <div key={c._id} className="bg-background p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="mono-label text-accent/80">{accession}</p>
                  {!c.criticalCallback?.readBackConfirmed && (
                    <LiveDot tone="bad" />
                  )}
                </div>
                <p className="mt-1 font-mono text-lg font-bold">
                  {patientName}
                </p>
                <p className="mono-label text-muted-foreground">
                  {c.order?.testName}
                </p>

                <div className="hairline mt-4 p-4">
                  <p className="mono-label text-muted-foreground">Findings</p>
                  <p className="text-destructive mt-1 font-mono text-base font-bold">
                    {c.findings || "See report"}
                  </p>
                  <p className="mono-label text-muted-foreground mt-1">
                    detected{" "}
                    {new Date(c.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>

                {c.criticalCallback?.readBackConfirmed ? (
                  <p className="mono-label text-brass mt-4">
                    Called {c.criticalCallback.clinician} at{" "}
                    {new Date(c.criticalCallback.calledAt).toLocaleString()} ·
                    read-back confirmed
                  </p>
                ) : (
                  <div className="mt-4">
                    <input
                      id={`clinician-called-${c._id}`}
                      aria-label="Clinician called"
                      title="Clinician called"
                      value={callbacks[c._id]?.clinician || ""}
                      onChange={(e) =>
                        setCallbacks((previous) => ({
                          ...previous,
                          [c._id]: {
                            clinician: e.target.value,
                            confirmed: previous[c._id]?.confirmed || false,
                          },
                        }))
                      }
                      placeholder="Clinician called"
                      className="hairline mono-label w-full bg-transparent px-3 py-2 outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
                    />
                    <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={callbacks[c._id]?.confirmed || false}
                        onChange={(e) =>
                          setCallbacks((previous) => ({
                            ...previous,
                            [c._id]: {
                              clinician: previous[c._id]?.clinician || "",
                              confirmed: e.target.checked,
                            },
                          }))
                        }
                      />
                      I confirmed the result by read-back with this clinician.
                    </label>
                    <div className="mt-2 flex gap-2">
                      <ActionButton
                        tone="solid"
                        disabled={saving === c._id}
                        onClick={() => recordCallback(c._id)}
                      >
                        <PhoneCall className="mr-1 inline size-3" /> Mark called
                      </ActionButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-5 sm:px-8">
        <Card>
          <p className="mono-label text-muted-foreground">
            Current pending critical results
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              [
                "Awaiting callback",
                rows.filter((r) => !r.criticalCallback?.readBackConfirmed)
                  .length,
              ],
              [
                "Callback documented",
                rows.filter((r) => r.criticalCallback?.readBackConfirmed)
                  .length,
              ],
              ["Open critical results", rows.length],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-2xl font-bold">{v}</p>
                <p className="mono-label text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
