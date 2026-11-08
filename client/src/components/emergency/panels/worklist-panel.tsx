"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Clock3, UserRound } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import { getSocket } from "@/lib/socket";
import {
  fetchMyEmergencyCasesApi,
  type EmergencyCaseData,
} from "@/lib/api/emergency";

export function EmergencyWorklistPanel() {
  const [cases, setCases] = useState<EmergencyCaseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCases = useCallback(async () => {
    try {
      const response = await fetchMyEmergencyCasesApi();
      setCases(response.cases || []);
    } catch (error) {
      console.error("Failed to load assigned ED cases:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCases();
    const socket = getSocket();
    const refresh = () => void loadCases();
    socket.on("emergency:triage_updated", refresh);
    return () => {
      socket.off("emergency:triage_updated", refresh);
    };
  }, [loadCases]);

  return (
    <section className="relative">
      <PanelHeader
        index="01 / clinician worklist"
        title="My ED cases"
        note="Active emergency cases assigned to your account, ordered by acuity and arrival time."
        actions={
          <ActionButton onClick={() => void loadCases()}>
            <RefreshCw className="mr-1 inline size-3" /> Refresh
          </ActionButton>
        }
      />
      {isLoading ? (
        <div
          role="status"
          className="p-12 text-center mono-label text-muted-foreground animate-pulse"
        >
          Loading your ED worklist…
        </div>
      ) : cases.length === 0 ? (
        <div className="hairline bg-background p-10 text-center">
          <UserRound className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-mono text-base font-semibold">
            No active cases assigned to you
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            A clinician can assign cases from the triage board. New assignments
            appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
          {cases.map((emergencyCase) => (
            <li key={emergencyCase._id} className="min-w-0 bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono-label text-accent font-bold">
                    {emergencyCase.id}
                  </p>
                  <h2 className="mt-1 truncate font-display text-xl font-semibold">
                    {emergencyCase.patient}
                  </h2>
                  <p className="mono-label text-muted-foreground">
                    {emergencyCase.age}
                    {emergencyCase.sex} · arrived {emergencyCase.arrived}
                  </p>
                </div>
                <Pill
                  tone={
                    emergencyCase.esi <= 2
                      ? "bad"
                      : emergencyCase.esi === 3
                        ? "warn"
                        : "mute"
                  }
                >
                  ESI {emergencyCase.esi}
                </Pill>
              </div>
              <p className="mt-4 text-sm font-medium">
                {emergencyCase.complaint}
              </p>
              <p className="mono-label mt-2 text-xs text-muted-foreground">
                {emergencyCase.obs || "Observations pending"}
              </p>
              <div className="hairline-t mt-4 flex items-center justify-between pt-3 text-xs">
                <span className="mono-label text-muted-foreground">
                  {emergencyCase.area} · {emergencyCase.disposition}
                </span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Clock3 className="size-3" />
                  {emergencyCase.waitMin}m
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
