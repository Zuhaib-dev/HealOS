"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Siren, AlertTriangle, Check, RefreshCw, X, Stethoscope, ArrowRight } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill, type Tone } from "@/components/workspace/ui";
import { getSocket } from "@/lib/socket";
import {
  fetchResusBaysApi,
  updateResusBayApi,
  callResusTeamApi,
  handoverToIcuApi,
  type ResusBayData,
} from "@/lib/api/emergency";

export function ResusPanel() {
  const [bays, setBays] = useState<ResusBayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [editingBay, setEditingBay] = useState<ResusBayData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadBays = useCallback(async () => {
    try {
      const res = await fetchResusBaysApi();
      if (res.success && res.bays) {
        setBays(res.bays);
      }
    } catch (err) {
      console.error("Failed to load resus bays:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBays();

    const socket = getSocket();
    const handleBayUpdate = () => {
      loadBays();
    };

    const handleResusAlert = (alertData: any) => {
      setActiveAlert(alertData.message || "🚨 CODE RESUS ALERT ACTIVATED!");
      loadBays();
    };

    socket.on("emergency:bay_updated", handleBayUpdate);
    socket.on("emergency:resus_alert", handleResusAlert);

    return () => {
      socket.off("emergency:bay_updated", handleBayUpdate);
      socket.off("emergency:resus_alert", handleResusAlert);
    };
  }, [loadBays]);

  const handleCallTeam = async (bayId?: string) => {
    const target = bayId || "Resus 1";
    try {
      await callResusTeamApi(target);
      setActiveAlert(`🚨 CODE RESUS ALERT BROADCAST FOR ${target}! Team dispatch in progress.`);
    } catch (err) {
      console.error("Failed to call resus team:", err);
    }
  };

  const handleHandoverIcu = async (bayId: string) => {
    if (!confirm(`Handover patient in ${bayId} to Intensive Care Unit (ICU)?`)) return;
    try {
      const res = await handoverToIcuApi(bayId);
      if (res.success) {
        setMessage(`Handover complete for ${bayId}. Bay transitioned to cleaning.`);
        setTimeout(() => setMessage(null), 3500);
        await loadBays();
      }
    } catch (err) {
      console.error("Failed to handover to ICU:", err);
    }
  };

  const handleMarkReady = async (bayId: string) => {
    try {
      await updateResusBayApi(bayId, { state: "ready" });
      await loadBays();
    } catch (err) {
      console.error("Failed to mark bay ready:", err);
    }
  };

  const handleSaveBayEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBay) return;

    setIsUpdating(true);
    try {
      await updateResusBayApi(editingBay.id, {
        state: editingBay.state,
        patient: editingBay.patient,
        team: editingBay.team,
        airway: editingBay.airway,
        lines: editingBay.lines,
        next: editingBay.next,
      });
      setEditingBay(null);
      await loadBays();
    } catch (err) {
      console.error("Failed to update bay:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="relative">
      <PanelHeader
        index="02 / resus"
        title="Resus bays"
        note="Bay-by-bay state with team, running resus clock, airway and access, plus the next timed intervention."
        actions={
          <div className="flex items-center gap-2">
            <ActionButton onClick={loadBays}>
              <RefreshCw className="mr-1 inline size-3" />
              Refresh
            </ActionButton>
            <ActionButton tone="solid" onClick={() => handleCallTeam("Resus 1")}>
              <Siren className="mr-1 inline size-3.5" />
              Call resus team
            </ActionButton>
          </div>
        }
      />

      {/* Code Resus Alert Banner */}
      {activeAlert && (
        <div className="mb-4 flex items-center justify-between border border-destructive bg-destructive/15 p-4 text-destructive animate-pulse">
          <div className="flex items-center gap-3">
            <Siren className="size-5 shrink-0" />
            <span className="font-mono text-sm font-bold tracking-wide">{activeAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="mono-label hover:bg-destructive/20 p-1 text-xs"
          >
            Acknowledge [X]
          </button>
        </div>
      )}

      {message && (
        <div className="mb-4 flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-500 text-xs mono-label">
          <Check className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Resus Bay Edit Modal */}
      {editingBay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-background hairline w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-mono text-base font-bold">Manage {editingBay.id}</h3>
              <button
                type="button"
                onClick={() => setEditingBay(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBayEdit} className="mt-4 space-y-3">
              <div>
                <label className="mono-label block text-muted-foreground text-xs">Bay State</label>
                <select
                  value={editingBay.state}
                  onChange={(e) => setEditingBay({ ...editingBay, state: e.target.value as any })}
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                >
                  <option value="occupied">Occupied</option>
                  <option value="ready">Ready (Available)</option>
                  <option value="cleaning">Cleaning / Restocking</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="mono-label block text-muted-foreground text-xs">Patient & Clinical Summary</label>
                <input
                  type="text"
                  value={editingBay.patient}
                  onChange={(e) => setEditingBay({ ...editingBay, patient: e.target.value })}
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm focus:outline-hidden"
                  placeholder="e.g. Unknown male · post-arrest"
                />
              </div>

              <div>
                <label className="mono-label block text-muted-foreground text-xs">Assigned Resus Team</label>
                <input
                  type="text"
                  value={editingBay.team}
                  onChange={(e) => setEditingBay({ ...editingBay, team: e.target.value })}
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm focus:outline-hidden"
                  placeholder="e.g. Dr. Varma + 3"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mono-label block text-muted-foreground text-xs">Airway Status</label>
                  <input
                    type="text"
                    value={editingBay.airway}
                    onChange={(e) => setEditingBay({ ...editingBay, airway: e.target.value })}
                    className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                    placeholder="e.g. ETT 8.0 / NIV"
                  />
                </div>
                <div>
                  <label className="mono-label block text-muted-foreground text-xs">Vascular Access</label>
                  <input
                    type="text"
                    value={editingBay.lines}
                    onChange={(e) => setEditingBay({ ...editingBay, lines: e.target.value })}
                    className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                    placeholder="e.g. 2 x 18G, IO"
                  />
                </div>
              </div>

              <div>
                <label className="mono-label block text-muted-foreground text-xs">Next Timed Intervention</label>
                <input
                  type="text"
                  value={editingBay.next}
                  onChange={(e) => setEditingBay({ ...editingBay, next: e.target.value })}
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                  placeholder="e.g. Repeat gas 14:20"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <ActionButton type="button" onClick={() => setEditingBay(null)}>
                  Cancel
                </ActionButton>
                <ActionButton type="submit" tone="solid" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Update Bay"}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid of Bays */}
      {isLoading ? (
        <div className="p-12 text-center mono-label text-muted-foreground animate-pulse">
          Loading resus bays...
        </div>
      ) : (
        <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
          {bays.map((b) => {
            const occupied = b.state === "occupied";
            return (
              <div key={b.id} className="bg-background p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mono-label text-accent/80 font-bold">{b.id}</p>
                    <p className="mt-1 font-mono text-lg font-bold">{b.patient}</p>
                  </div>
                  <Pill tone={occupied ? "bad" : b.state === "ready" ? "ok" : "warn"}>{b.state}</Pill>
                </div>

                <svg viewBox="0 0 200 44" className="mt-3 h-11 w-full">
                  <line x1="0" y1="22" x2="200" y2="22" stroke="var(--hairline)" />
                  {occupied && (
                    <motion.path
                      d="M0 22 H60 l6 -14 l6 28 l6 -14 H200"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="1.4"
                      initial={{ pathLength: 0, opacity: 0.4 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </svg>

                <dl className="mono-label mt-2 space-y-1.5">
                  {[
                    ["Team", b.team],
                    ["Clock", b.clock],
                    ["Airway", b.airway],
                    ["Access", b.lines],
                    ["Next", b.next],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton onClick={() => setEditingBay(b)}>
                    Manage chart
                  </ActionButton>
                  {occupied ? (
                    <ActionButton tone="solid" onClick={() => handleHandoverIcu(b.id)}>
                      Handover to ICU
                    </ActionButton>
                  ) : b.state === "cleaning" ? (
                    <ActionButton tone="solid" onClick={() => handleMarkReady(b.id)}>
                      Mark Ready ✓
                    </ActionButton>
                  ) : (
                    <ActionButton onClick={() => handleCallTeam(b.id)}>
                      Standby Alert
                    </ActionButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
