"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Bandage } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { Pill, Sparkline } from "@/components/workspace/ui";
import { fetchWoundsApi, type Wound } from "@/lib/api/nurse";
import { toast } from "sonner";
import { NurseHeader } from "@/components/nurse/nurse-header";

export function WoundCarePanel() {
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    fetchWoundsApi()
      .then((data) => setWounds(data.wounds))
      .catch(() => toast.error("Could not load wound records"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ordered = [...wounds].sort(
    (a, b) => Number(b.overdue) - Number(a.overdue),
  );

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <NurseHeader
        title="Wound care"
        note="Open wounds by bed: stage, size trend, dressing, and when the next change is due."
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
      ) : ordered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Bandage className="mb-3 size-8 text-muted-foreground/30" />
          <p className="font-medium">No wound records</p>
        </div>
      ) : (
        <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((w) => {
            const key = `${w._id}-${w.site}`;
            return (
              <article key={key} className="min-w-0 bg-background p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="mono-label text-accent/80">{w.bed}</p>
                    <p className="mt-1 truncate font-semibold">{w.patient}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.site} · {w.type}
                    </p>
                  </div>
                  {w.overdue ? (
                    <span className="shrink-0 text-[10px] font-bold tracking-wider text-destructive uppercase">
                      Overdue
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pill tone="warn">{w.stage}</Pill>
                  <Pill tone={w.exudate === "high" ? "bad" : "mute"}>
                    exudate {w.exudate}
                  </Pill>
                  <Pill tone="mute">{w.size}</Pill>
                </div>

                {w.healing?.length ? (
                  <div className="mt-4">
                    <Sparkline
                      values={w.healing}
                      tone={w.overdue ? "bad" : "accent"}
                    />
                    <p className="mono-label text-muted-foreground">
                      Surface area (cm²)
                    </p>
                  </div>
                ) : null}

                <dl className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Dressing</dt>
                    <dd className="text-right">{w.dressing}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Last change</dt>
                    <dd>{w.lastChange}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Next</dt>
                    <dd className={w.overdue ? "text-destructive" : ""}>
                      {w.nextChange}
                    </dd>
                  </div>
                </dl>

                {w.photoNote ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {w.photoNote}
                  </p>
                ) : null}

                <div className="mt-4">
                  <ActionButton
                    tone="solid"
                    onClick={() => setDone((d) => ({ ...d, [key]: true }))}
                    disabled={done[key]}
                  >
                    {done[key] ? "Change logged" : "Log dressing change"}
                  </ActionButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
