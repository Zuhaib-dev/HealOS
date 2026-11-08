"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Siren,
  AlertTriangle,
  Check,
  RefreshCw,
  Printer,
  Plus,
  X,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, Pill, Toggle } from "@/components/workspace/ui";
import { getSocket } from "@/lib/socket";
import {
  fetchMajorIncidentApi,
  saveMajorIncidentConfigApi,
  toggleMajorIncidentApi,
  toggleCascadeStepApi,
  type MajorIncidentData,
} from "@/lib/api/emergency";

export function MajorIncidentPanel() {
  const [incident, setIncident] = useState<MajorIncidentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({
    surgeBeds: "",
    theatresArmed: "",
    staffRecalled: "",
    steps: [""],
  });

  const loadIncident = useCallback(async () => {
    try {
      const res = await fetchMajorIncidentApi();
      if (res.success) {
        setIncident(res.incident);
      }
    } catch (err) {
      console.error("Failed to load major incident protocol:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openConfig = () => {
    setConfigForm({
      surgeBeds: incident?.surgeBeds == null ? "" : String(incident.surgeBeds),
      theatresArmed:
        incident?.theatresArmed == null ? "" : String(incident.theatresArmed),
      staffRecalled:
        incident?.staffRecalled == null ? "" : String(incident.staffRecalled),
      steps: incident?.steps.map((step) => step.text) || [""],
    });
    setIsEditingConfig(true);
    setFeedback(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const surgeBeds = Number(configForm.surgeBeds);
    const theatresArmed = Number(configForm.theatresArmed);
    const staffRecalled = Number(configForm.staffRecalled);
    if (
      ![surgeBeds, theatresArmed, staffRecalled].every(
        (value) => Number.isInteger(value) && value >= 0,
      ) ||
      configForm.steps.some((step) => !step.trim())
    ) {
      setFeedback(
        "Enter whole-number capacities and complete every checklist step.",
      );
      return;
    }
    setIsSavingConfig(true);
    setFeedback(null);
    try {
      const res = await saveMajorIncidentConfigApi({
        surgeBeds,
        theatresArmed,
        staffRecalled,
        steps: configForm.steps.map((text) => ({
          text: text.trim(),
          completed: false,
        })),
      });
      setIncident(res.incident);
      setIsEditingConfig(false);
      setFeedback(res.message);
    } catch (err) {
      setFeedback(
        (err as any)?.response?.data?.message ||
          "Failed to save the hospital incident plan.",
      );
    } finally {
      setIsSavingConfig(false);
    }
  };

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

  const handleToggleStep = async (
    stepIdx: number,
    currentCompleted: boolean,
  ) => {
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
        note="Hospital-approved escalation instructions and capacity must be configured before disaster mode can be activated."
        actions={
          <div className="flex items-center gap-2">
            <ActionButton onClick={loadIncident}>
              <RefreshCw className="mr-1 inline size-3" />
              Refresh
            </ActionButton>
            <ActionButton onClick={openConfig} disabled={isArmed}>
              <Plus className="mr-1 inline size-3.5" />
              {incident ? "Edit hospital plan" : "Configure hospital plan"}
            </ActionButton>
            {incident && (
              <ActionButton tone="solid" onClick={() => window.print()}>
                <Printer className="mr-1 inline size-3.5" />
                Print cascade card
              </ActionButton>
            )}
          </div>
        }
      />

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="hairline mb-4 flex items-center justify-between gap-3 bg-background p-3 text-sm"
        >
          <span>{feedback}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setFeedback(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {isEditingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveConfig}
            className="bg-background hairline max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="mono-label text-accent text-xs font-bold">
                  HOSPITAL CONFIGURATION
                </p>
                <h3 className="font-mono text-lg font-bold">
                  Major incident response plan
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close plan editor"
                onClick={() => setIsEditingConfig(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter approved local surge capacity and response steps. This plan
              is saved as standby; it does not activate disaster mode.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["surgeBeds", "Surge beds"],
                  ["theatresArmed", "Theatres available"],
                  ["staffRecalled", "Staff to recall"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="mono-label text-xs">
                  {label}
                  <input
                    required
                    type="number"
                    min={0}
                    max={10000}
                    value={configForm[field]}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, [field]: e.target.value })
                    }
                    className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="mono-label text-xs">
                  Approved response checklist
                </p>
                <ActionButton
                  type="button"
                  onClick={() =>
                    setConfigForm({
                      ...configForm,
                      steps: [...configForm.steps, ""],
                    })
                  }
                  disabled={configForm.steps.length >= 30}
                >
                  <Plus className="mr-1 inline size-3" />
                  Add step
                </ActionButton>
              </div>
              <div className="space-y-2">
                {configForm.steps.map((step, index) => (
                  <div key={index} className="flex gap-2">
                    <label
                      className="sr-only"
                      htmlFor={`incident-step-${index}`}
                    >
                      Response step {index + 1}
                    </label>
                    <input
                      id={`incident-step-${index}`}
                      required
                      maxLength={300}
                      value={step}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          steps: configForm.steps.map((value, i) =>
                            i === index ? e.target.value : value,
                          ),
                        })
                      }
                      className="hairline bg-foreground/3 min-w-0 flex-1 p-2 text-sm"
                      placeholder={`Step ${index + 1}`}
                    />
                    <ActionButton
                      type="button"
                      aria-label={`Remove step ${index + 1}`}
                      onClick={() =>
                        setConfigForm({
                          ...configForm,
                          steps: configForm.steps.filter((_, i) => i !== index),
                        })
                      }
                      disabled={configForm.steps.length <= 1}
                    >
                      <X className="size-4" />
                    </ActionButton>
                  </div>
                ))}
              </div>
            </div>
            {feedback && (
              <p role="alert" className="text-sm text-destructive">
                {feedback}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t pt-4">
              <ActionButton
                type="button"
                onClick={() => setIsEditingConfig(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="submit"
                tone="solid"
                disabled={isSavingConfig}
              >
                {isSavingConfig ? "Saving…" : "Save approved plan"}
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="p-12 text-center mono-label text-muted-foreground animate-pulse"
        >
          Loading major incident protocols...
        </div>
      ) : !incident ? (
        <div className="hairline bg-background p-8 sm:p-10">
          <p className="font-mono text-base font-semibold">
            No approved incident plan configured
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Disaster mode is unavailable until an authorized team configures the
            hospital&apos;s actual escalation checklist and surge capacity.
          </p>
          <ActionButton tone="solid" onClick={openConfig} className="mt-5">
            <Plus className="mr-1 inline size-3.5" /> Configure approved plan
          </ActionButton>
        </div>
      ) : (
        <div
          className="grid gap-px lg:grid-cols-[1fr_1.2fr]"
          style={{ background: "var(--hairline)" }}
        >
          <div className="bg-background p-5 sm:p-8">
            <div
              className={`hairline flex items-center justify-between gap-4 p-5 transition-colors ${
                isArmed ? "border-destructive/60 bg-destructive/5" : ""
              }`}
            >
              <div>
                <p className="mono-label text-muted-foreground text-xs">
                  Major incident protocol
                </p>
                <p
                  className={`mt-1 font-mono text-2xl font-bold ${isArmed ? "text-destructive" : ""}`}
                >
                  {isArmed ? "ARMED — MASS CASUALTY" : "STANDBY"}
                </p>
                {incident?.armedAt && (
                  <p className="mono-label text-muted-foreground mt-1 text-xs">
                    Activated:{" "}
                    {new Date(incident.armedAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    by {incident.armedBy}
                  </p>
                )}
              </div>
              <Toggle
                on={isArmed}
                onChange={(val) => !isToggling && handleToggleArmed(val)}
              />
            </div>

            {isArmed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <Card>
                  <p className="mono-label text-destructive font-bold text-xs">
                    <Siren className="mr-1 inline size-3.5 animate-pulse" />
                    Surge capacity released
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    {[
                      [
                        "Surge beds",
                        incident.surgeBeds == null
                          ? "—"
                          : `+${incident.surgeBeds}`,
                      ],
                      [
                        "Theatres armed",
                        incident.theatresArmed == null
                          ? "—"
                          : String(incident.theatresArmed),
                      ],
                      [
                        "Staff recalled",
                        incident.staffRecalled == null
                          ? "—"
                          : String(incident.staffRecalled),
                      ],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="font-mono text-2xl font-bold">{v}</p>
                        <p className="mono-label text-muted-foreground text-xs">
                          {k}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            <div className="mono-label text-muted-foreground mt-5 space-y-2 text-xs">
              <p>
                <AlertTriangle className="mr-1 inline size-3 text-amber-500" />
                Triage sieve: P1 immediate · P2 urgent · P3 delayed · P4
                expectant
              </p>
              <p>Commander: ED consultant · Loggist: assigned at activation</p>
            </div>
          </div>

          <div className="bg-background p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="mono-label text-muted-foreground text-xs">
                Action cascade checklist
              </p>
              <Pill
                tone={
                  doneCount === steps.length && steps.length > 0 ? "ok" : "warn"
                }
              >
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
                        step.completed
                          ? "bg-accent text-background"
                          : "hairline"
                      }`}
                    >
                      {step.completed && <Check className="size-3" />}
                    </span>
                    <div className="flex-1">
                      <span
                        className={`text-sm ${step.completed ? "line-through text-muted-foreground" : ""}`}
                      >
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
