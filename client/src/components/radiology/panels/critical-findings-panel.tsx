"use client";

import { useEffect, useState, useMemo } from "react";
import {
  PhoneCall,
  Check,
  TriangleAlert,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  Phone,
  ShieldAlert,
  Clock,
  Layers,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import {
  fetchCriticalFindingsApi,
  CriticalFindingRecord,
} from "@/lib/api/radiology";
import { toast } from "sonner";

export function CriticalPanel() {
  const [findings, setFindings] = useState<CriticalFindingRecord[]>([]);
  const [called, setCalled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"OPEN" | "CALLED" | "ALL">("OPEN");
  const [search, setSearch] = useState("");

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchCriticalFindingsApi();
      if (res.status === "success") {
        const list = res.data.findings || [];
        setFindings(list);
        setCalled((prev) => ({
          ...Object.fromEntries(list.map((c) => [c.accession, c.called])),
          ...prev,
        }));
      }
    } catch {
      toast.error("Failed to load critical findings");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkCalled = (accession: string, clinician: string) => {
    setCalled((p) => ({ ...p, [accession]: true }));
    toast.success(
      `Voice read-back logged with Dr. ${clinician} for ${accession}!`,
    );
  };

  const openCount = useMemo(
    () => findings.filter((c) => !called[c.accession]).length,
    [findings, called],
  );
  const calledCount = useMemo(
    () => findings.filter((c) => called[c.accession]).length,
    [findings, called],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return findings.filter((c) => {
      const isAcknowledged = Boolean(called[c.accession]);
      if (filter === "OPEN" && isAcknowledged) return false;
      if (filter === "CALLED" && !isAcknowledged) return false;

      if (!q) return true;
      const text =
        `${c.finding || ""} ${c.patientName || ""} ${c.accession || ""} ${c.clinician || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [findings, called, filter, search]);

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="05 / closed-loop safety"
        title="Radiology Critical Findings & Callbacks"
        note="15-minute closed-loop verbal communication requirement. Immediate notification for intracranial bleeds, pulmonary emboli, pneumothorax, and aortic emergencies."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              aria-label="Refresh critical findings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Metric Cards Bar */}
      <div className="p-4 sm:px-6 bg-card/40 border-b border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400 font-bold">
                Action Required (Pending Call)
              </p>
              <p className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {openCount}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="size-5 animate-pulse" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                Closed-Loop Documented
              </p>
              <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {calledCount}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">
                Total Emergency Flags
              </p>
              <p className="font-mono text-2xl font-bold text-foreground mt-0.5">
                {findings.length}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <ShieldAlert className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("OPEN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "OPEN"
                ? "bg-rose-600 text-white font-semibold shadow-xs"
                : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
            }`}
          >
            Immediate Action Required ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CALLED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "CALLED"
                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            Acknowledged ({calledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "ALL"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Findings ({findings.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            id="critical-findings-search"
            aria-label="Search critical findings"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, finding, clinician..."
            className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 p-4 sm:p-6 bg-muted/15">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
            <p className="font-mono text-sm">
              Loading emergency radiology findings...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-card rounded-2xl border border-border/70 p-8">
            <CheckCircle2 className="size-12 mb-3 text-emerald-600 opacity-60" />
            <p className="font-bold text-foreground text-base">
              {filter === "OPEN"
                ? "No Outstanding Critical Findings"
                : "No Findings Match Filters"}
            </p>
            <p className="text-xs max-w-sm mt-1">
              All acute findings have been acknowledged and documented in
              compliance with clinical safety guidelines.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => {
              const isAcknowledged = Boolean(called[c.accession]);

              return (
                <div
                  key={c._id}
                  className={`bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                    !isAcknowledged
                      ? "border-rose-500/50 ring-1 ring-rose-500/20"
                      : "border-border/80 hover:border-primary/40"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                          {c.accession}
                        </span>
                        <h4 className="font-mono text-base font-bold text-foreground mt-1">
                          {c.patientName}
                        </h4>
                      </div>

                      {!isAcknowledged ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                          <TriangleAlert className="size-3" /> PENDING CALL
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                          <CheckCircle2 className="size-3" /> ACKNOWLEDGED
                        </span>
                      )}
                    </div>

                    <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <p className="text-[10px] uppercase font-mono tracking-wider font-bold text-rose-700 dark:text-rose-300">
                        Critical Imaging Finding
                      </p>
                      <p className="text-rose-600 dark:text-rose-400 font-mono text-base font-bold mt-1">
                        {c.finding}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        Flagged at: <strong>{c.atTime}</strong> · Target
                        Clinician:{" "}
                        <strong className="text-foreground">
                          {c.clinician}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleMarkCalled(c.accession, c.clinician)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isAcknowledged
                          ? "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                          : "bg-rose-600 hover:bg-rose-700 text-white"
                      }`}
                    >
                      <PhoneCall className="size-3.5" />
                      <span>
                        {isAcknowledged
                          ? "Log Repeat Voice Read-Back"
                          : "Confirm Verbal Read-Back"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
