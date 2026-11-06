"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal */

import { useCallback, useEffect, useState } from "react";
import { Droplets, Loader2, RefreshCw } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import { fetchFluidBalancesApi, type FluidBalance } from "@/lib/api/nurse";
import { toast } from "sonner";
import { NurseHeader } from "@/components/nurse/nurse-header";

const kinds = ["oral", "iv", "urine", "drain"] as const;

export function FluidBalancePanel() {
  const [entries, setEntries] = useState<FluidBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]>("oral");

  const load = useCallback(() => {
    fetchFluidBalancesApi()
      .then((data) => setEntries(data.fluids))
      .catch(() => toast.error("Could not load fluid balances"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const commit = (bed: string) => {
    const v = Number(amount);
    if (!v) {
      toast.error("Enter a volume in mL");
      return;
    }
    setEntries((list) =>
      list.map((e) =>
        e.bed !== bed
          ? e
          : {
              ...e,
              intakeOral: kind === "oral" ? e.intakeOral + v : e.intakeOral,
              intakeIV: kind === "iv" ? e.intakeIV + v : e.intakeIV,
              outputUrine: kind === "urine" ? e.outputUrine + v : e.outputUrine,
              outputDrain: kind === "drain" ? e.outputDrain + v : e.outputDrain,
            },
      ),
    );
    setAmount("");
    setAddTo(null);
    toast.success(`Logged ${v} mL ${kind}`);
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <NurseHeader
        title="Fluid balance"
        note="Running intake and output per bed against the prescribed target."
        actions={
          <ActionButton
            onClick={() => {
              setLoading(true);
              load();
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ActionButton>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Droplets className="mb-3 size-8 text-muted-foreground/30" />
          <p className="font-medium">No fluid charts</p>
        </div>
      ) : (
        <div className="grid gap-px bg-border/60 lg:grid-cols-2">
          {entries.map((e) => {
            const intake = e.intakeOral + e.intakeIV;
            const output = e.outputUrine + e.outputDrain;
            const net = intake - output;
            const denom = Math.max(Math.abs(e.target) || 1800, 1);
            const width = Math.min(100, (Math.abs(net) / denom) * 100);
            return (
              <article key={e.bed} className="min-w-0 bg-background p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mono-label text-accent/80">{e.bed}</p>
                    <p className="mt-1 truncate font-semibold">{e.patient}</p>
                  </div>
                  <Pill tone={Math.abs(net - e.target) <= 250 ? "ok" : "bad"}>
                    net {net > 0 ? "+" : ""}
                    {net} mL
                  </Pill>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-px bg-border/60">
                  {[
                    ["Oral", e.intakeOral],
                    ["IV", e.intakeIV],
                    ["Urine", e.outputUrine],
                    ["Drain", e.outputDrain],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-background px-1 py-3 text-center"
                    >
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {k}
                      </p>
                      <p className="mt-1 font-mono text-sm">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 h-1.5 w-full bg-muted">
                  <div
                    className={`h-full ${net >= 0 ? "bg-accent" : "bg-destructive"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Target {e.target > 0 ? "+" : ""}
                  {e.target} mL
                  {e.restriction ? ` · max ${e.restriction} mL/24h` : ""}
                </p>

                {addTo === e.bed ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {kinds.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={`px-2.5 py-1.5 text-xs font-medium ${
                          kind === k
                            ? "bg-foreground text-background"
                            : "border border-border/60"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                    <input
                      id={`fluid-amount-${e.bed}`}
                      aria-label="Fluid volume in milliliters"
                      value={amount}
                      onChange={(ev) => setAmount(ev.target.value)}
                      placeholder="mL"
                      inputMode="numeric"
                      className="w-20 border border-border/60 bg-transparent px-2 py-1.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <ActionButton tone="solid" onClick={() => commit(e.bed)}>
                      Log
                    </ActionButton>
                  </div>
                ) : (
                  <div className="mt-4">
                    <ActionButton onClick={() => setAddTo(e.bed)}>
                      Log intake / output
                    </ActionButton>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
