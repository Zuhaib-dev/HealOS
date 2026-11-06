"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal */

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessagesSquare, RefreshCw } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import {
  createHandoverApi,
  fetchNurseHandoversApi,
  type NurseHandover,
} from "@/lib/api/nurse";
import { toast } from "sonner";
import { NurseHeader } from "@/components/nurse/nurse-header";

export function HandoverPanel() {
  const [notes, setNotes] = useState<NurseHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState({
    bed: "",
    situation: "",
    recommendation: "",
  });

  const load = useCallback(() => {
    fetchNurseHandoversApi()
      .then((data) => setNotes(data.handovers))
      .catch(() => toast.error("Could not load handovers"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const post = async () => {
    if (!draft.bed.trim() || !draft.situation.trim()) {
      toast.error("Bed and situation are required");
      return;
    }
    if (!/^[A-Za-z0-9-]+$/.test(draft.bed.trim())) {
      toast.error("Bed can only use letters, numbers, and hyphens");
      return;
    }
    setPosting(true);
    try {
      const res = await createHandoverApi({
        patientName: "New entry",
        bed: draft.bed.trim(),
        situation: draft.situation.trim(),
        background: "—",
        assessment: "—",
        recommendation: draft.recommendation.trim() || "—",
        acuity: "stable",
      });
      if (res.success) {
        toast.success("Handover posted");
        setDraft({ bed: "", situation: "", recommendation: "" });
        const refreshed = await fetchNurseHandoversApi();
        setNotes(refreshed.handovers);
      }
    } catch {
      toast.error("Could not post handover");
    } finally {
      setPosting(false);
    }
  };

  const ordered = [...notes].sort((a, b) => {
    const rank = (h: NurseHandover) =>
      h.acuity === "critical" ? 0 : h.acuity === "guarded" ? 1 : 2;
    return rank(a) - rank(b);
  });

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <NurseHeader
        title="Shift handover"
        note="SBAR by bed. Critical notes stay at the top for the incoming nurse."
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

      <div className="grid flex-1 gap-px bg-border/60 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)]">
        <div className="order-2 min-w-0 bg-background lg:order-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : ordered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <MessagesSquare className="mb-3 size-8 text-muted-foreground/30" />
              <p className="font-medium">No handover notes</p>
            </div>
          ) : (
            ordered.map((h) => (
              <article
                key={h._id || h.bed}
                className="border-b border-border/40 p-4 last:border-b-0 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-mono text-sm">
                    <span className="text-accent">{h.bed}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {h.patientName || "Unknown"}
                    </span>
                  </p>
                  <Pill
                    tone={
                      h.acuity === "critical"
                        ? "bad"
                        : h.acuity === "guarded"
                          ? "warn"
                          : "ok"
                    }
                  >
                    {h.acuity}
                  </Pill>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    ["S", h.situation],
                    ["B", h.background],
                    ["A", h.assessment],
                    ["R", h.recommendation],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="w-4 shrink-0 font-mono text-accent">
                        {k}
                      </dt>
                      <dd className="min-w-0">{v}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))
          )}
        </div>

        <form
          className="order-1 min-w-0 bg-background p-4 sm:p-5 lg:order-2"
          onSubmit={(e) => {
            e.preventDefault();
            void post();
          }}
        >
          <p className="font-display text-sm font-bold">Add note</p>
          <label
            htmlFor="nurse-handover-bed"
            className="mono-label mt-4 block text-[10px] text-muted-foreground uppercase"
          >
            Bed
          </label>
          <input
            id="nurse-handover-bed"
            value={draft.bed}
            onChange={(e) => setDraft({ ...draft, bed: e.target.value })}
            placeholder="W3-12"
            className="mt-1.5 w-full border border-border/60 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <label
            htmlFor="nurse-handover-situation"
            className="mono-label mt-3 block text-[10px] text-muted-foreground uppercase"
          >
            Situation
          </label>
          <textarea
            id="nurse-handover-situation"
            value={draft.situation}
            onChange={(e) => setDraft({ ...draft, situation: e.target.value })}
            placeholder="What is happening now"
            rows={3}
            className="mt-1.5 w-full resize-none border border-border/60 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <label
            htmlFor="nurse-handover-recommendation"
            className="mono-label mt-3 block text-[10px] text-muted-foreground uppercase"
          >
            Recommendation
          </label>
          <textarea
            id="nurse-handover-recommendation"
            value={draft.recommendation}
            onChange={(e) =>
              setDraft({ ...draft, recommendation: e.target.value })
            }
            placeholder="What the next nurse should do"
            rows={3}
            className="mt-1.5 w-full resize-none border border-border/60 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ActionButton
            type="submit"
            tone="solid"
            disabled={posting || loading}
            className="mt-4"
          >
            {posting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Post handover"
            )}
          </ActionButton>
        </form>
      </div>
    </section>
  );
}
