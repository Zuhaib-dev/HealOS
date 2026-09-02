"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Siren, AlertTriangle, Check, RefreshCw, Printer } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, Pill, Toggle } from "@/components/workspace/ui";
import { getSocket } from "@/lib/socket";
import {
  fetchMajorIncidentApi,
  toggleMajorIncidentApi,
  toggleCascadeStepApi,
  type MajorIncidentData,
} from "@/lib/api/emergency";

export function MajorIncidentPanel() {
  const [incident, setIncident] = useState<MajorIncidentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const loadIncident = useCallback(async () => {
    try {
      const res = await fetchMajorIncidentApi();
      if (res.success && res.incident) {
        setIncident(res.incident);
      }
    } catch (err) {
      console.error("Failed to load major incident protocol:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncident();

    const socket = getSocket();
    const handleIncidentUpdate = () => {
      loadIncident();
    };

    socket.on("emergency:incident_updated", handleIncidentUpdate);
    return () => {
      socket.off("emergency:incident_updated", handleIncidentUpdate);
    };
  }, [loadIncident]);

  const handleToggleArmed = async (targetArmed: boolean) => {
    setIsToggling(true);
    try {
      const res = await toggleMajorIncidentApi(targetArmed);
      if (res.success && res.incident) {
        setIncident(res.incident);
      }
    } catch (err) {
      console.error("Failed to toggle major incident:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleStep = async (stepIdx: number, currentCompleted: boolean) => {
    try {
      // Optimistic update
      if (incident) {
        const updatedSteps = [...incident.steps];
        if (updatedSteps[stepIdx]) {
          updatedSteps[stepIdx].completed = !currentCompleted;
          setIncident({ ...incident, steps: updatedSteps });
        }
      }

      await toggleCascadeStepApi(stepIdx, !currentCompleted);
      await loadIncident();
    } catch (err) {
      console.error("Failed to toggle cascade step:", err);
      await loadIncident();
    }
  };

  const isArmed = Boolean(incident?.isArmed);
  const steps = incident?.steps || [];
  const doneCount = steps.filter((s) => s.completed).length;

  return (
    <section className="relative">
      <PanelHeader
        index="04 / escalation"
        title="Disaster / mass-casualty mode"
        note="Arming this mode switches the department to triage-sieve capture, releases surge capacity and drives the action cascade."
        actions={
          <div className="flex items-center gap-2">
            <ActionButton onClick={loadIncident}>
              <RefreshCw className="mr-1 inline size-3" />
              Refresh
            </ActionButton>
            <ActionButton tone="solid" onClick={() => window.print()}>
              <Printer className="mr-1 inline size-3.5" />
              Print cascade card
            </ActionButton>
          </div>
        }
      />

      {isLoading ? (
        <div className="p-12 text-center mono-label text-muted-foreground animate-pulse">
          Loading major incident protocols...
        </div>
      ) : (
        <div className="grid gap-px lg:grid-cols-[1fr_1.2fr]" style={{ background: "var(--hairline)" }}>
          <div className="bg-background p-5 sm:p-8">
            <div className={`hairline flex items-center justify-between gap-4 p-5 transition-colors ${
              isArmed ? "border-destructive/60 bg-destructive/5" : ""
            }`}>
              <div>
                <p className="mono-label text-muted-foreground text-xs">Major incident protocol</p>
                <p className={`mt-1 font-mono text-2xl font-bold ${isArmed ? "text-destructive" : ""}`}>
                  {isArmed ? "ARMED — MASS CASUALTY" : "STANDBY"}
                </p>
                {incident?.armedAt && (
                  <p className="mono-label text-muted-foreground mt-1 text-xs">
                    Activated: {new Date(incident.armedAt).toLocaleTimeString()} by {incident.armedBy}
                  </p>
                )}
              </div>
              <Toggle on={isArmed} onChange={(val) => !isToggling && handleToggleArmed(val)} />
            </div>

            {isArmed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                <Card>
                  <p className="mono-label text-destructive font-bold text-xs">
                    <Siren className="mr-1 inline size-3.5 animate-pulse" />
                    Surge capacity released
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    {[
                      ["Surge beds", `+${incident?.surgeBeds || 42}`],
                      ["Theatres armed", String(incident?.theatresArmed || 3)],
                      ["Staff recalled", String(incident?.staffRecalled || 68)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="font-mono text-2xl font-bold">{v}</p>
                        <p className="mono-label text-muted-foreground text-xs">{k}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            <div className="mono-label text-muted-foreground mt-5 space-y-2 text-xs">
              <p>
                <AlertTriangle className="mr-1 inline size-3 text-amber-500" />
                Triage sieve: P1 immediate · P2 urgent · P3 delayed · P4 expectant
              </p>
              <p>Commander: ED consultant · Loggist: assigned at activation</p>
            </div>
          </div>

          <div className="bg-background p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="mono-label text-muted-foreground text-xs">Action cascade checklist</p>
              <Pill tone={doneCount === steps.length && steps.length > 0 ? "ok" : "warn"}>
                {doneCount} / {steps.length} completed
              </Pill>
            </div>
            <ul className="mt-4 space-y-2">
              {steps.map((step, i) => (
                <li key={step.text}>
                  <button
                    type="button"
                    onClick={() => handleToggleStep(i, step.completed)}
                    className={`hairline flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-foreground/3 ${
                      step.completed ? "bg-accent/5 border-accent/40" : ""
                    }`}
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded-xs ${
                        step.completed ? "bg-accent text-background" : "hairline"
                      }`}
                    >
                      {step.completed && <Check className="size-3" />}
                    </span>
                    <div className="flex-1">
                      <span className={`text-sm ${step.completed ? "line-through text-muted-foreground" : ""}`}>
                        {step.text}
                      </span>
                      {step.completed && step.completedBy && (
                        <p className="mono-label text-accent text-xs mt-0.5">
                          ✓ Signed off by {step.completedBy}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
