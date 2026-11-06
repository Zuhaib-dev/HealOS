"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * theme: Emerald Prestige (locked HealOS tokens)
 * audience: front-desk staff · use: scan desk load, jump to register/queue/collect
 * tone: utilitarian
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Activity,
  Landmark,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  Users,
  Monitor,
} from "lucide-react";
import {
  fetchReceptionOverviewApi,
  type ReceptionOverviewData,
} from "@/lib/api/reception";
import { getSocket } from "@/lib/socket";
import { formatTime12Hour, formatTimeRange } from "@/lib/time-format";

function MetricCell({
  title,
  value,
  subValue,
  note,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string;
  subValue?: string;
  note: string;
  icon: typeof UserPlus;
  isLoading: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col bg-background p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="mono-label text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </span>
        <Icon className="size-3.5 shrink-0 text-muted-foreground/50" />
      </div>
      <div role="status" aria-live="polite">
        {isLoading ? (
          <div className="mb-1 h-8 w-20 animate-pulse bg-foreground/10" />
        ) : (
          <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
            <span className="font-display text-3xl font-bold tracking-tight text-foreground">
              {value}
            </span>
            {subValue ? (
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {subValue}
              </span>
            ) : null}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

export default function ReceptionOverview() {
  const [data, setData] = useState<ReceptionOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetchReceptionOverviewApi();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load reception overview:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();

    const socket = getSocket();
    const handleUpdate = () => {
      void loadOverview();
    };

    socket.on("reception:overview_updated", handleUpdate);
    socket.on("reception:token_created", handleUpdate);
    socket.on("reception:bill_paid", handleUpdate);

    return () => {
      socket.off("reception:overview_updated", handleUpdate);
      socket.off("reception:token_created", handleUpdate);
      socket.off("reception:bill_paid", handleUpdate);
    };
  }, [loadOverview]);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const insuranceValue = data?.insurance.value;
  const insuranceSub = data?.insurance.subValue;

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-350 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register walk-ins, call the OPD queue, and collect pending bills.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loading}
            className="hairline inline-flex items-center gap-2 px-3 py-2 font-mono text-xs transition-colors hover:bg-foreground/6 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <Link
            href="/reception/new"
            prefetch
            className="inline-flex items-center gap-2 bg-accent px-3 py-2 font-mono text-xs font-bold text-background transition-colors hover:bg-accent/90"
          >
            <UserPlus className="size-3.5" />
            New registration
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/60 lg:grid-cols-4">
        <MetricCell
          title="Today"
          value={data ? String(data.registrations.total) : "0"}
          note={data?.registrations.note || "Registrations today"}
          icon={UserPlus}
          isLoading={loading}
        />
        <MetricCell
          title="Waiting"
          value={data ? String(data.tokens.waiting) : "0"}
          subValue={
            data?.tokens.avgWaitMinutes
              ? `${data.tokens.avgWaitMinutes}m avg`
              : undefined
          }
          note={data?.tokens.note || "In OPD queue"}
          icon={Activity}
          isLoading={loading}
        />
        <MetricCell
          title="Collected"
          value={data?.collections.value || "₹0"}
          subValue={data?.collections.subValue}
          note={data?.collections.note || "Cash, card, and UPI"}
          icon={Landmark}
          isLoading={loading}
        />
        <MetricCell
          title="Insurance"
          value={insuranceValue || "—"}
          subValue={insuranceValue ? insuranceSub : undefined}
          note={data?.insurance.note || "Captured at check-in"}
          icon={ShieldCheck}
          isLoading={loading}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-3">
        <Link
          href="/reception/new"
          prefetch
          className="flex items-center gap-3 bg-background px-4 py-3 transition-colors hover:bg-foreground/3"
        >
          <UserPlus className="size-4 text-accent" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Register patient</span>
            <span className="block text-xs text-muted-foreground">
              Issue an OPD token
            </span>
          </span>
          <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        </Link>
        <Link
          href="/reception/queue"
          prefetch
          className="flex items-center gap-3 bg-background px-4 py-3 transition-colors hover:bg-foreground/3"
        >
          <Users className="size-4 text-accent" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Call queue</span>
            <span className="block text-xs text-muted-foreground">
              Next token per department
            </span>
          </span>
          <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        </Link>
        <Link
          href="/reception/counter"
          prefetch
          className="flex items-center gap-3 bg-background px-4 py-3 transition-colors hover:bg-foreground/3"
        >
          <Monitor className="size-4 text-accent" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Collect payment</span>
            <span className="block text-xs text-muted-foreground">
              Pending invoices
            </span>
          </span>
          <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        </Link>
      </div>

      <div className="mt-6 min-w-0 flex-1 border border-border/60">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold">Waiting now</h2>
            <p className="text-xs text-muted-foreground">Live OPD queue</p>
          </div>
          <Link
            href="/reception/queue"
            prefetch
            className="mono-label inline-flex shrink-0 items-center gap-1 text-[10px] font-medium transition-colors hover:text-accent"
          >
            Full queue <ArrowRight className="size-3" />
          </Link>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
            Loading queue…
          </div>
        ) : !data?.recentQueue || data.recentQueue.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No patients waiting.
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {data.recentQueue.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="font-mono text-sm font-bold text-accent">
                    {item.tokenNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.patientName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.department}
                      {item.doctorName ? ` · ${item.doctorName}` : ""}
                      {item.queueNumber
                        ? ` · #${String(item.queueNumber).padStart(2, "0")}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground sm:justify-end">
                  <span className="truncate">
                    {item.arrivalTime
                      ? `Arrive ${formatTime12Hour(item.arrivalTime)} · `
                      : ""}
                    {formatTimeRange(item.timeSlot, item.slotEndTime)}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono">
                    <Clock className="size-3" /> {item.waitMinutes}m
                  </span>
                  <span className="mono-label bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                    {item.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
