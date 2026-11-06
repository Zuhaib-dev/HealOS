"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  X,
  PauseCircle,
  TriangleAlert,
  Pill as PillIcon,
  Loader2,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import {
  administerMarDoseApi,
  fetchMarDosesApi,
  type MarDose,
} from "@/lib/api/nurse";
import { toast } from "sonner";
import { NurseHeader } from "@/components/nurse/nurse-header";

const filters = [
  { id: "all", label: "All" },
  { id: "due", label: "Due" },
  { id: "high", label: "High-alert" },
  { id: "controlled", label: "Controlled" },
] as const;

export function EmarPanel() {
  const [rows, setRows] = useState<MarDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchMarDosesApi()
      .then((data) => {
        setRows(data.doses);
      })
      .catch(() => {
        toast.error("Could not load the medication record");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = rows.filter((d) =>
    filter === "all"
      ? true
      : filter === "due"
        ? d.state === "due" || d.state === "overdue"
        : filter === "high"
          ? d.highAlert
          : d.controlled,
  );

  const setDoseState = async (id: string, state: MarDose["state"]) => {
    setProcessingId(id);
    if (state === "given") {
      try {
        await administerMarDoseApi(id);
        toast.success("Dose given");
      } catch {
        toast.error("Could not log this dose");
        setProcessingId(null);
        return;
      }
    } else {
      toast.success(state === "held" ? "Dose held" : "Dose refused");
    }
    setRows((r) => r.map((d) => (d._id === id ? { ...d, state } : d)));
    setProcessingId(null);
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <NurseHeader
        title="Medication round"
        note="Give, hold, or refuse due doses. High-alert and controlled drugs stay flagged until they close."
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

      <div className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-3 sm:px-6 lg:px-8">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border/60 px-4 py-16 text-center">
            <Check className="mb-3 size-8 text-success/50" />
            <p className="font-medium">Nothing in this filter</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No doses match the current view.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-px bg-border/60 lg:grid-cols-2 xl:grid-cols-3">
            {visible.map((d) => (
              <li
                key={d._id}
                className={`flex min-w-0 flex-col bg-background ${
                  d.state === "overdue" ? "ring-1 ring-destructive/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-border/40 p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-accent">{d.bed}</p>
                    <h3 className="truncate font-semibold">{d.patient}</h3>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {d.time}
                      {d.window ? ` · ${d.window}` : ""}
                    </p>
                  </div>
                  <span className="mono-label shrink-0 border border-border/50 px-2 py-1 text-[10px] uppercase">
                    {d.state === "given" ? (
                      <Check className="mr-1 inline size-3 text-success" />
                    ) : null}
                    {d.state === "overdue" ? (
                      <AlertCircle className="mr-1 inline size-3 text-destructive" />
                    ) : null}
                    {d.state}
                  </span>
                </div>

                <div className="flex flex-1 gap-3 p-4">
                  <PillIcon
                    className={`size-5 shrink-0 ${d.highAlert ? "text-destructive" : "text-primary"}`}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{d.drug}</p>
                    <p className="mt-1 font-mono text-sm">
                      {d.dose}{" "}
                      <span className="text-muted-foreground">{d.route}</span>
                    </p>
                    {d.note ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {d.note}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {d.highAlert ? (
                        <span className="inline-flex items-center gap-1 border border-destructive/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-destructive uppercase">
                          <TriangleAlert className="size-3" /> High-alert
                        </span>
                      ) : null}
                      {d.controlled ? (
                        <span className="border border-border/60 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                          Controlled
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/40 p-3">
                  {d.state === "due" || d.state === "overdue" ? (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={processingId === d._id}
                        onClick={() => void setDoseState(d._id, "given")}
                        className="flex flex-col items-center gap-1 py-2 text-success hover:bg-success/10 disabled:opacity-50"
                      >
                        {processingId === d._id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        <span className="text-[10px] font-bold uppercase">
                          Give
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={processingId === d._id}
                        onClick={() => void setDoseState(d._id, "held")}
                        className="flex flex-col items-center gap-1 py-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        <PauseCircle className="size-4" />
                        <span className="text-[10px] font-bold uppercase">
                          Hold
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={processingId === d._id}
                        onClick={() => void setDoseState(d._id, "refused")}
                        className="flex flex-col items-center gap-1 py-2 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <X className="size-4" />
                        <span className="text-[10px] font-bold uppercase">
                          Refuse
                        </span>
                      </button>
                    </div>
                  ) : (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      Closed
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
