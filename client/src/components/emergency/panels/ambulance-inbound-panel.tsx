"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Ambulance, RefreshCw, X, Check } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill, type Tone } from "@/components/workspace/ui";
import { getSocket } from "@/lib/socket";
import {
  fetchInboundAmbulancesApi,
  assignAmbulanceBayApi,
  type InboundAmbulanceData,
  type EsiLevel,
} from "@/lib/api/emergency";

const esiTone = (e: EsiLevel): Tone => (e <= 2 ? "bad" : e === 3 ? "warn" : "mute");

export function InboundPanel() {
  const [units, setUnits] = useState<InboundAmbulanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningUnit, setAssigningUnit] = useState<InboundAmbulanceData | null>(null);
  const [selectedBay, setSelectedBay] = useState("Resus 1");
  const [isSaving, setIsSaving] = useState(false);

  const loadUnits = useCallback(async () => {
    try {
      const res = await fetchInboundAmbulancesApi();
      if (res.success && res.units) {
        setUnits(res.units);
      }
    } catch (err) {
      console.error("Failed to load inbound ambulances:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();

    const socket = getSocket();
    const handleInboundUpdate = () => {
      loadUnits();
    };

    socket.on("emergency:inbound_updated", handleInboundUpdate);
    return () => {
      socket.off("emergency:inbound_updated", handleInboundUpdate);
    };
  }, [loadUnits]);

  const handleConfirmBayAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUnit) return;

    setIsSaving(true);
    try {
      const res = await assignAmbulanceBayApi(assigningUnit.unit, selectedBay);
      if (res.success) {
        setAssigningUnit(null);
        await loadUnits();
      }
    } catch (err) {
      console.error("Failed to assign bay:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const prealertCount = units.filter((u) => u.prealert).length;

  return (
    <section className="relative">
      <PanelHeader
        index="03 / inbound"
        title="Ambulance inbound"
        note="Every unit en route with ETA, pre-alert status and the crew's handover summary so the receiving team is standing ready."
        actions={
          <div className="flex items-center gap-2">
            <ActionButton onClick={loadUnits}>
              <RefreshCw className="mr-1 inline size-3" />
              Refresh
            </ActionButton>
            <ActionButton tone="solid">
              {prealertCount} pre-alert{prealertCount === 1 ? "" : "s"}
            </ActionButton>
          </div>
        }
      />

      {/* Bay Assignment Dialog */}
      {assigningUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-background hairline w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-mono text-base font-bold">Assign Bay to {assigningUnit.unit}</h3>
              <button
                type="button"
                onClick={() => setAssigningUnit(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mono-label text-muted-foreground mt-3 text-xs">
              <p>Condition: {assigningUnit.presentingComplaint}</p>
              <p className="mt-1">Crew: {assigningUnit.crew}</p>
            </div>

            <form onSubmit={handleConfirmBayAssignment} className="mt-4 space-y-4">
              <div>
                <label className="mono-label block text-muted-foreground text-xs">Receiving Bay / Area</label>
                <select
                  value={selectedBay}
                  onChange={(e) => setSelectedBay(e.target.value)}
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                >
                  <option value="Resus 1">Resus Bay 1 (Critical)</option>
                  <option value="Resus 2">Resus Bay 2 (Critical)</option>
                  <option value="Acute 1">Acute Bay 1</option>
                  <option value="Acute 2">Acute Bay 2</option>
                  <option value="Majors 1">Majors Bay 1</option>
                  <option value="Majors 2">Majors Bay 2</option>
                  <option value="Triage / Assessment">Triage Assessment Bay</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <ActionButton type="button" onClick={() => setAssigningUnit(null)}>
                  Cancel
                </ActionButton>
                <ActionButton type="submit" tone="solid" disabled={isSaving}>
                  {isSaving ? "Assigning..." : "Confirm Bay"}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center mono-label text-muted-foreground animate-pulse">
          Connecting to regional EMS dispatch feed...
        </div>
      ) : units.length === 0 ? (
        <div className="p-12 text-center mono-label text-muted-foreground">
          No ambulances currently en route.
        </div>
      ) : (
        <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
          {units.map((i) => {
            const hasBay = Boolean(i.assignedBay);
            return (
              <div key={i.unit} className="bg-background p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="mono-label text-accent/80 font-bold">
                    <Ambulance className="mr-1 inline size-3.5" />
                    {i.unit}
                  </p>
                  {i.prealert && <Pill tone="bad">pre-alert</Pill>}
                </div>
                <p className="mt-2 font-mono text-3xl font-bold">{i.etaMinutes}′</p>
                <p className="mono-label text-muted-foreground text-xs">estimated arrival</p>

                <svg viewBox="0 0 200 24" className="mt-4 h-6 w-full">
                  <line x1="4" y1="16" x2="196" y2="16" stroke="var(--hairline)" />
                  <rect x="188" y="6" width="8" height="10" fill="none" stroke="var(--color-accent)" />
                  <motion.circle
                    cy="16"
                    r="3.5"
                    fill="var(--color-accent)"
                    initial={{ cx: 6 }}
                    animate={{ cx: 6 + 180 * (i.progress || 0.5) }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  />
                </svg>

                <p className="mt-3 text-sm font-medium">{i.presentingComplaint}</p>
                <p className="mono-label text-muted-foreground mt-2 text-xs">{i.observations}</p>
                <p className="mono-label text-muted-foreground mt-1 text-xs">{i.crew}</p>

                {i.assignedBay && (
                  <p className="mono-label text-accent mt-2 text-xs font-bold">
                    Assigned: {i.assignedBay}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Pill tone={esiTone(i.esi as EsiLevel)}>ESI {i.esi}</Pill>
                  <ActionButton
                    tone={hasBay ? undefined : "solid"}
                    onClick={() => {
                      setAssigningUnit(i);
                      if (i.assignedBay) setSelectedBay(i.assignedBay);
                    }}
                  >
                    {hasBay ? `${i.assignedBay} ✓` : "Assign bay"}
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
