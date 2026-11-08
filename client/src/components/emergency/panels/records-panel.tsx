"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import {
  fetchEmergencyRecordsApi,
  type EmergencyCaseData,
} from "@/lib/api/emergency";

export function EmergencyRecordsPanel() {
  const [cases, setCases] = useState<EmergencyCaseData[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await fetchEmergencyRecordsApi({
        page,
        q: query.trim() || undefined,
        status,
      });
      setCases(result.cases);
      setPages(Math.max(1, result.pages));
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load ED records:", error);
    } finally {
      setBusy(false);
    }
  }, [page, query, status]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <section>
      <PanelHeader
        index="03 / visit register"
        title="ED records"
        note="Search every emergency visit, including discharged, transferred, admitted and archived cases. Each case ID retains its own longitudinal visit chart."
      />
      <div className="flex flex-col gap-3 border-y border-border bg-background p-4 sm:flex-row">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="absolute left-3 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search case ID, patient or complaint"
            className="h-11 w-full border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-11 border border-border bg-background px-3 text-sm"
        >
          <option value="all">All visits</option>
          <option value="active">Active in department</option>
          <option value="closed">Closed / archived</option>
        </select>
        <span className="mono-label self-center text-muted-foreground">
          {total} records
        </span>
      </div>
      {busy ? (
        <p
          role="status"
          className="p-10 text-center mono-label text-muted-foreground"
        >
          Loading ED records…
        </p>
      ) : cases.length ? (
        <>
          <div className="divide-y divide-border border-b border-border">
            {cases.map((item) => (
              <Link
                key={item._id}
                href={`/emergency/records/${encodeURIComponent(item._id)}`}
                className="grid gap-3 bg-background p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono-label font-bold text-accent">
                      {item.id}
                    </span>
                    <Pill
                      tone={
                        item.esi <= 2 ? "bad" : item.esi === 3 ? "warn" : "mute"
                      }
                    >
                      ESI {item.esi}
                    </Pill>
                    <span className="mono-label text-muted-foreground">
                      {item.disposition}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-base font-semibold">
                    {item.patient}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {item.age}
                      {item.sex}
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.complaint}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="mono-label text-muted-foreground">
                    Arrived {new Date(item.arrivedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm">
                    {item.assignedDoctorName || "No clinician assigned"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="mono-label text-muted-foreground">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="hairline flex h-9 items-center gap-1 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((value) => value + 1)}
                className="hairline flex h-9 items-center gap-1 px-3 disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="hairline mt-px bg-background p-12 text-center">
          <Archive className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-medium">No matching ED records</p>
        </div>
      )}
    </section>
  );
}
