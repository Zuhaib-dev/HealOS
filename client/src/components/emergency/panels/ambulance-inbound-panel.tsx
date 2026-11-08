"use client";

import { useState, useEffect, useCallback } from "react";
import { Ambulance, RefreshCw, X, Plus, Check } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Pill, type Tone } from "@/components/workspace/ui";
import { getSocket } from "@/lib/socket";
import {
  fetchInboundAmbulancesApi,
  createInboundAmbulanceApi,
  assignAmbulanceBayApi,
  fetchResusBaysApi,
  recordAmbulanceArrivalApi,
  type InboundAmbulanceData,
  type ResusBayData,
  type EsiLevel,
} from "@/lib/api/emergency";

const esiTone = (e: EsiLevel): Tone =>
  e <= 2 ? "bad" : e === 3 ? "warn" : "mute";

export function InboundPanel() {
  const [units, setUnits] = useState<InboundAmbulanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningUnit, setAssigningUnit] =
    useState<InboundAmbulanceData | null>(null);
  const [selectedBay, setSelectedBay] = useState("Resus 1");
  const [availableBays, setAvailableBays] = useState<ResusBayData[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [arrivalUnit, setArrivalUnit] = useState<InboundAmbulanceData | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({
    unit: "",
    etaMinutes: "",
    presentingComplaint: "",
    esi: 2 as EsiLevel,
    crew: "",
    observations: "",
    prealert: false,
  });
  const [arrivalForm, setArrivalForm] = useState({
    patientName: "",
    age: "",
    sex: "O" as "M" | "F" | "O",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      const res = await assignAmbulanceBayApi(assigningUnit.unit, selectedBay);
      if (res.success) {
        setAssigningUnit(null);
        setFeedback(`${assigningUnit.unit} assigned to ${selectedBay}.`);
        await loadUnits();
      }
    } catch (err) {
      const message = (err as any)?.response?.data?.message;
      setFeedback(message || "Failed to assign bay.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await createInboundAmbulanceApi({
        ...registerForm,
        unit: registerForm.unit.trim(),
        etaMinutes: Number(registerForm.etaMinutes),
        presentingComplaint: registerForm.presentingComplaint.trim(),
        crew: registerForm.crew.trim(),
        observations: registerForm.observations.trim() || "obs pending",
      });
      setRegisterForm({
        unit: "",
        etaMinutes: "",
        presentingComplaint: "",
        esi: 2,
        crew: "",
        observations: "",
        prealert: false,
      });
      setIsRegisterOpen(false);
      setFeedback("Inbound unit registered.");
      await loadUnits();
    } catch (err) {
      setFeedback(
        (err as any)?.response?.data?.message ||
          "Failed to register ambulance.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openBayAssignment = async (unit: InboundAmbulanceData) => {
    setAssigningUnit(unit);
    try {
      const res = await fetchResusBaysApi();
      const readyBays = (res.bays || []).filter((bay) => bay.state === "ready");
      setAvailableBays(readyBays);
      setSelectedBay(unit.assignedBay || readyBays[0]?.id || "");
    } catch {
      setAvailableBays([]);
      setSelectedBay("");
    }
  };

  const handleArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrivalUnit) return;
    const age = Number(arrivalForm.age);
    if (!Number.isInteger(age) || age < 0 || age > 130) {
      setFeedback("Enter a whole-number age from 0 to 130.");
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await recordAmbulanceArrivalApi(arrivalUnit.unit, {
        patientName: arrivalForm.patientName.trim(),
        age,
        sex: arrivalForm.sex,
      });
      setArrivalUnit(null);
      setArrivalForm({ patientName: "", age: "", sex: "O" });
      setFeedback(`Arrival linked to triage case ${res.case.id}.`);
      await loadUnits();
    } catch (err) {
      setFeedback(
        (err as any)?.response?.data?.message || "Failed to record arrival.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const prealertCount = units.filter((u) => u.prealert).length;

  return (
    <section className="relative">
      <PanelHeader
        index="03 / inbound"
        title="Ambulance inbound"
        note={`${prealertCount} priority pre-alert${prealertCount === 1 ? "" : "s"} · ETAs and handovers recorded by your emergency team.`}
        actions={
          <div className="flex items-center gap-2">
            <ActionButton onClick={loadUnits}>
              <RefreshCw className="mr-1 inline size-3" />
              Refresh
            </ActionButton>
            <ActionButton tone="solid" onClick={() => setIsRegisterOpen(true)}>
              <Plus className="mr-1 inline size-3.5" /> Register inbound unit
            </ActionButton>
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

      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleRegisterUnit}
            className="bg-background hairline w-full max-w-lg space-y-4 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-mono text-base font-bold">
                Register inbound ambulance
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsRegisterOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="mono-label text-xs">
                Unit ID
                <input
                  required
                  maxLength={40}
                  value={registerForm.unit}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, unit: e.target.value })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                  placeholder="e.g. EMS-102"
                />
              </label>
              <label className="mono-label text-xs">
                ETA minutes
                <input
                  required
                  type="number"
                  min={0}
                  max={1440}
                  value={registerForm.etaMinutes}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      etaMinutes: e.target.value,
                    })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                />
              </label>
            </div>
            <label className="mono-label block text-xs">
              Presenting complaint
              <input
                required
                maxLength={500}
                value={registerForm.presentingComplaint}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    presentingComplaint: e.target.value,
                  })
                }
                className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="mono-label text-xs">
                ESI
                <select
                  value={registerForm.esi}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      esi: Number(e.target.value) as EsiLevel,
                    })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      ESI {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mono-label text-xs">
                Crew / service
                <input
                  required
                  maxLength={120}
                  value={registerForm.crew}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, crew: e.target.value })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                />
              </label>
            </div>
            <label className="mono-label block text-xs">
              Handover observations
              <input
                maxLength={1000}
                value={registerForm.observations}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    observations: e.target.value,
                  })
                }
                className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                placeholder="Leave pending if not yet received"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={registerForm.prealert}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    prealert: e.target.checked,
                  })
                }
              />{" "}
              Priority pre-alert received
            </label>
            <div className="flex justify-end gap-2 border-t pt-4">
              <ActionButton
                type="button"
                onClick={() => setIsRegisterOpen(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton type="submit" tone="solid" disabled={isSubmitting}>
                {isSubmitting ? "Registering…" : "Register unit"}
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {arrivalUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleArrival}
            className="bg-background hairline w-full max-w-md space-y-4 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-mono text-base font-bold">
                Record {arrivalUnit.unit} arrival
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setArrivalUnit(null)}
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              This creates a linked active case on the triage board using the
              EMS complaint, ESI, observations, and receiving bay.
            </p>
            <label className="mono-label block text-xs">
              Patient name
              <input
                required
                maxLength={120}
                value={arrivalForm.patientName}
                onChange={(e) =>
                  setArrivalForm({
                    ...arrivalForm,
                    patientName: e.target.value,
                  })
                }
                className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                placeholder="Use Unknown patient if unidentified"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="mono-label text-xs">
                Age
                <input
                  required
                  type="number"
                  min={0}
                  max={130}
                  value={arrivalForm.age}
                  onChange={(e) =>
                    setArrivalForm({ ...arrivalForm, age: e.target.value })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                />
              </label>
              <label className="mono-label text-xs">
                Sex
                <select
                  value={arrivalForm.sex}
                  onChange={(e) =>
                    setArrivalForm({
                      ...arrivalForm,
                      sex: e.target.value as "M" | "F" | "O",
                    })
                  }
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm"
                >
                  <option value="O">Unspecified</option>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <ActionButton type="button" onClick={() => setArrivalUnit(null)}>
                Cancel
              </ActionButton>
              <ActionButton type="submit" tone="solid" disabled={isSubmitting}>
                {isSubmitting ? "Recording…" : "Arrived · create triage case"}
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {/* Bay Assignment Dialog */}
      {assigningUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-background hairline w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-mono text-base font-bold">
                Assign Bay to {assigningUnit.unit}
              </h3>
              <button
                type="button"
                onClick={() => setAssigningUnit(null)}
                aria-label={`Close assign bay dialog for ${assigningUnit.unit}`}
                className="text-muted-foreground hover:text-foreground p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Close assign bay dialog</span>
              </button>
            </div>

            <div className="mono-label text-muted-foreground mt-3 text-xs">
              <p>Condition: {assigningUnit.presentingComplaint}</p>
              <p className="mt-1">Crew: {assigningUnit.crew}</p>
            </div>

            <form
              onSubmit={handleConfirmBayAssignment}
              className="mt-4 space-y-4"
            >
              <div>
                <label
                  htmlFor="receiving-bay-select"
                  className="mono-label block text-muted-foreground text-xs"
                >
                  Receiving Bay / Area
                </label>
                <select
                  id="receiving-bay-select"
                  required
                  value={selectedBay}
                  onChange={(e) => setSelectedBay(e.target.value)}
                  className="hairline bg-foreground/3 mt-1 w-full p-2 text-sm font-mono focus:outline-hidden"
                >
                  <option value="">Select an available configured bay</option>
                  {availableBays.map((bay) => (
                    <option key={bay.id} value={bay.id}>
                      {bay.id}
                    </option>
                  ))}
                </select>
              </div>
              {availableBays.length === 0 && (
                <p className="text-xs text-amber-600">
                  No ready resus bays are configured. Set up a bay or direct the
                  patient to an appropriate area before assigning.
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <ActionButton
                  type="button"
                  onClick={() => setAssigningUnit(null)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  tone="solid"
                  disabled={isSubmitting || availableBays.length === 0}
                >
                  {isSubmitting ? "Assigning..." : "Confirm Bay"}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="p-12 text-center mono-label text-muted-foreground animate-pulse"
        >
          Connecting to regional EMS dispatch feed...
        </div>
      ) : units.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="p-12 text-center mono-label text-muted-foreground"
        >
          No ambulances currently en route.
        </div>
      ) : (
        <div
          className="grid gap-px lg:grid-cols-3"
          style={{ background: "var(--hairline)" }}
        >
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
                <p className="mt-2 font-mono text-3xl font-bold">
                  {i.etaMinutes}′
                </p>
                <p className="mono-label text-muted-foreground text-xs">
                  estimated arrival
                </p>

                <p className="mt-3 text-sm font-medium">
                  {i.presentingComplaint}
                </p>
                <p className="mono-label text-muted-foreground mt-2 text-xs">
                  {i.observations}
                </p>
                <p className="mono-label text-muted-foreground mt-1 text-xs">
                  {i.crew}
                </p>

                {i.assignedBay && (
                  <p className="mono-label text-accent mt-2 text-xs font-bold">
                    Assigned: {i.assignedBay}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Pill tone={esiTone(i.esi as EsiLevel)}>ESI {i.esi}</Pill>
                  <ActionButton
                    tone={hasBay ? undefined : "solid"}
                    onClick={() => openBayAssignment(i)}
                  >
                    {hasBay ? `${i.assignedBay} ✓` : "Assign bay"}
                  </ActionButton>
                  <ActionButton onClick={() => setArrivalUnit(i)}>
                    <Check className="mr-1 inline size-3.5" /> Record arrival
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
