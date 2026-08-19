"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Droplets, Bandage, Bell } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, Sparkline, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchMarDosesApi, type MarDose } from "@/lib/api/nurse";
import { toast } from "sonner";


/* ---------- 02 eMAR (real data) ---------- */

const stateTone: Record<MarDose["state"], Tone> = {
  due: "info",
  overdue: "bad",
  given: "ok",
  held: "warn",
  refused: "warn",
};

export function EmarPanel() {
  const [rows, setRows] = useState<MarDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "due" | "high" | "controlled">("all");

  useEffect(() => {
    fetchMarDosesApi()
      .then((data) => {
        setRows(data.doses);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load medication records");
        setLoading(false);
      });
  }, []);

  const visible = rows.filter((d) =>
    filter === "all"
      ? true
      : filter === "due"
        ? d.state === "due" || d.state === "overdue"
        : filter === "high"
          ? d.highAlert
          : d.controlled,
  );

  const set = async (id: string, state: MarDose["state"]) => {
    if (state === "given") {
      try {
        const { administerMarDoseApi } = await import("@/lib/api/nurse");
        await administerMarDoseApi(id);
        toast.success("Dose administered and logged.");
      } catch (err) {
        toast.error("Failed to log administration.");
        return;
      }
    }
    setRows((r) => r.map((d) => (d._id === id ? { ...d, state } : d)));
  };

  return (
    <section>
      <PanelHeader
        index="02 / eMAR"
        title="Medication administration"
        note="Barcode-ready administration record. High-alert and controlled drugs demand a second signature before the dose closes."
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All</ActionButton>
            <ActionButton onClick={() => setFilter("due")}>Due / overdue</ActionButton>
            <ActionButton onClick={() => setFilter("high")}>High-alert</ActionButton>
            <ActionButton tone="solid" onClick={() => setFilter("controlled")}>
              Controlled
            </ActionButton>
          </>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-250">
          <thead className="hairline-b">
            <tr>
              <Th>Bed / patient</Th>
              <Th>Drug</Th>
              <Th>Dose / route</Th>
              <Th>Window</Th>
              <Th>Checks</Th>
              <Th>State</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground align-middle">Loading medication records...</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground align-middle">No records match the current filter.</td>
              </tr>
            ) : visible.map((d) => (
              <tr key={d._id} className="hairline-b hover:bg-foreground/2">
                <Td>
                  <p className="mono-label text-accent/80">{d.bed}</p>
                  <p className="font-medium">{d.patient}</p>
                </Td>
                <Td>
                  <p className="font-medium">{d.drug}</p>
                  {d.note && <p className="mono-label text-muted-foreground">{d.note}</p>}
                </Td>
                <Td>
                  <span className="font-mono">{d.dose}</span>
                  <span className="mono-label text-muted-foreground ml-2">{d.route}</span>
                </Td>
                <Td>
                  <p className="font-mono">{d.time}</p>
                  <p className="mono-label text-muted-foreground">{d.window}</p>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {d.highAlert && (
                      <Pill tone="bad">
                        <TriangleAlert className="mr-1 inline size-3" />
                        high-alert
                      </Pill>
                    )}
                    {d.controlled && <Pill tone="warn">CD register</Pill>}
                    {!d.highAlert && !d.controlled && <Pill tone="mute">standard</Pill>}
                  </div>
                </Td>
                <Td>
                  <Pill tone={stateTone[d.state]}>{d.state}</Pill>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    {d.state === "due" || d.state === "overdue" ? (
                      <>
                        <button type="button" onClick={() => set(d._id, "given")} className="hairline mono-label flex items-center gap-1 px-2.5 py-1.5 hover:bg-foreground/5">
                          <Check className="size-3" /> Give
                        </button>
                        <button type="button" onClick={() => set(d._id, "held")} className="hairline mono-label flex items-center gap-1 px-2.5 py-1.5 hover:bg-foreground/5">
                          <PauseCircle className="size-3" /> Hold
                        </button>
                        <button type="button" onClick={() => set(d._id, "refused")} className="hairline mono-label text-destructive flex items-center gap-1 px-2.5 py-1.5 hover:bg-destructive/10">
                          <X className="size-3" /> Refused
                        </button>
                      </>
                    ) : (
                      <span className="mono-label text-muted-foreground text-xs">{d.state.toUpperCase()}</span>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
