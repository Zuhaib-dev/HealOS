"use client";

/* Hallmark · macrostructure: Bento Grid · genre: modern-minimal
 * states: hover, live data
 * contrast: pass
 */

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { UserPlus, Activity, Landmark, ShieldCheck, RefreshCw, Clock, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";
import { fetchReceptionOverviewApi, ReceptionOverviewData } from "@/lib/api/reception";
import { getSocket } from "@/lib/socket";

// Reusable Cell Shell
function MetricCard({
  title,
  value,
  subValue,
  note,
  icon: Icon,
  delay = 0,
  className = "",
  isLoading = false,
}: {
  title: string;
  value: string;
  subValue?: string;
  note: string;
  icon: any;
  delay?: number;
  className?: string;
  isLoading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`group relative flex flex-col p-6 rounded-3xl bg-card/60 border border-border/60 shadow-sm hover:shadow-md hover:bg-card/80 transition-all overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between mb-6">
        <span className="mono-label text-muted-foreground uppercase tracking-wider font-semibold text-xs">
          {title}
        </span>
        <Icon className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
      <div className="relative z-10 flex flex-col justify-end flex-1">
        {isLoading ? (
          <div className="h-12 w-28 bg-foreground/10 rounded-lg animate-pulse mb-2" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold tracking-tight text-foreground">{value}</span>
            {subValue && <span className="font-mono text-sm font-semibold text-muted-foreground">{subValue}</span>}
          </div>
        )}
        <p className="text-sm font-medium text-muted-foreground mt-4">{note}</p>
      </div>
    </motion.div>
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
    loadOverview();

    const socket = getSocket();
    const handleUpdate = () => {
      loadOverview();
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

  // Dynamic Greeting based on client hour
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning." : currentHour < 17 ? "Good afternoon." : "Good evening.";

  return (
    <section className="p-4 sm:p-6 lg:p-8 max-w-350 mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">{greeting}</h1>
          <p className="text-muted-foreground mt-2">
            Live patient registration, OPD token queue, and billing overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="hairline bg-foreground/3 hover:bg-foreground/6 inline-flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-none transition-colors"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Feed
          </button>
          <Link
            href="/reception/new"
            className="bg-accent text-background hover:bg-accent/90 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold font-mono transition-colors shadow-xs"
          >
            <UserPlus className="size-3.5" />
            New Registration
          </Link>
        </div>
      </motion.div>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(220px,auto)]">
        <MetricCard
          title="Registrations today"
          value={data ? String(data.registrations.total) : "0"}
          note={data?.registrations.note || "Live patient intake"}
          icon={UserPlus}
          delay={0.1}
          isLoading={loading}
          className="lg:col-span-2"
        />

        <MetricCard
          title="Tokens waiting"
          value={data ? String(data.tokens.waiting) : "0"}
          note={data?.tokens.note || "Active in OPD queue"}
          icon={Activity}
          delay={0.2}
          isLoading={loading}
          className="lg:col-span-1"
        />

        <MetricCard
          title="Collections"
          value={data?.collections.value || "₹0"}
          subValue={data?.collections.subValue}
          note={data?.collections.note || "cash + card + UPI"}
          icon={Landmark}
          delay={0.3}
          isLoading={loading}
          className="lg:col-span-1"
        />

        <MetricCard
          title="Insurance captured"
          value={data?.insurance.value || "96.4"}
          subValue={data?.insurance.subValue || "%"}
          note={data?.insurance.note || "target 95%"}
          icon={ShieldCheck}
          delay={0.4}
          isLoading={loading}
          className="lg:col-span-4"
        />
      </div>

      {/* Live Recent OPD Queue Strip */}
      <div className="mt-8 rounded-3xl border border-border/60 bg-card/40 p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
          <div>
            <span className="mono-label text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Live OPD Queue
            </span>
            <h3 className="font-mono text-base font-bold mt-1">Recent Waiting Patients</h3>
          </div>
          <Link
            href="/reception/queue"
            className="mono-label text-xs hover:text-accent inline-flex items-center gap-1 font-medium transition-colors"
          >
            View Full Queue <ArrowRight className="size-3" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center mono-label text-muted-foreground animate-pulse text-xs">
            Connecting to live reception OPD queue...
          </div>
        ) : !data?.recentQueue || data.recentQueue.length === 0 ? (
          <div className="p-8 text-center mono-label text-muted-foreground text-xs">
            No patients currently waiting in OPD queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recentQueue.map((item) => (
              <div
                key={item.id}
                className="hairline bg-foreground/2 p-4 flex flex-col justify-between rounded-xl hover:bg-foreground/4 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="mono-label text-accent font-bold text-sm">{item.tokenNumber}</span>
                  <span className="mono-label text-xs bg-accent/10 text-accent px-2 py-0.5">
                    {item.status}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-medium text-sm text-foreground">{item.patientName}</p>
                  <p className="mono-label text-xs text-muted-foreground mt-0.5">
                    {item.department} · {item.doctorName}
                  </p>
                </div>
                <div className="mono-label text-muted-foreground mt-3 flex items-center justify-between text-xs border-t border-border/30 pt-2">
                  <span>Slot: {item.timeSlot}</span>
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock className="size-3" /> {item.waitMinutes}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
