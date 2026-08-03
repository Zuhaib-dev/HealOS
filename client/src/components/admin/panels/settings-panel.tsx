import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Check, X, TriangleAlert } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  approvals,
  staff,
  wards,
  audit,
  invoices,
  supplies,
  throughput,
} from "./admin-data";
import { ActionButton, PanelHeader } from "./admin-shell";

/* ---------- shared primitives ---------- */

function Metric({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: string;
  delta?: string;
  suffix?: string;
}) {
  return (
    <div className="hairline-l px-5 py-5">
      <p className="mono-label text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
        {value}
        {suffix ? <span className="text-muted-foreground text-base"> {suffix}</span> : null}
      </p>
      {delta ? (
        <p className="mono-label text-brass mt-2 flex items-center gap-1">
          <ArrowUpRight className="size-3" />
          {delta}
        </p>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-b overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">{children}</table>
    </div>
  );
}


/* ---------- 08 settings ---------- */

function Toggle({ label, note, initial }: { label: string; note: string; initial?: boolean }) {
  const [on, setOn] = useState(!!initial);
  return (
    <div className="hairline-b flex items-center justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground mt-1 text-xs">{note}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        aria-label={label}
        className={`hairline relative h-6 w-11 shrink-0 transition-colors ${on ? "bg-accent/25" : ""}`}
      >
        <motion.span
          className={`absolute top-[3px] size-4 ${on ? "bg-accent" : "bg-muted-foreground/60"}`}
          animate={{ left: on ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        />
      </button>
    </div>
  );
}

export function SettingsPanel() {
  return (
    <section>
      <PanelHeader
        index="08 / CONFIG"
        title="Facility settings"
        note="Governance switches that apply hospital-wide the moment they are changed."
        actions={<ActionButton tone="solid">Save changes</ActionButton>}
      />
      <div className="grid lg:grid-cols-2">
        <div className="hairline-b px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Access & safety</p>
          <div className="mt-3">
            <Toggle label="Enforce 2FA for clinical roles" note="Blocks record access without a second factor." initial />
            <Toggle label="Break-glass emergency access" note="Allows override with mandatory post-hoc review." initial />
            <Toggle label="Auto-suspend dormant accounts" note="Deactivates accounts idle for 45 days." />
            <Toggle label="Restrict exports to on-site network" note="Blocks bulk export from outside the facility." initial />
          </div>
        </div>
        <div className="hairline-b hairline-l px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Facility profile</p>
          <div className="mt-4 space-y-4">
            {[
              ["Facility name", "St. Meridian General"],
              ["Licence number", "HF-2026-8841"],
              ["Timezone", "UTC+00:00"],
              ["Escalation contact", "ops@meridian.health"],
            ].map(([label, value]) => (
              <label key={label} className="block">
                <span className="mono-label text-muted-foreground">{label}</span>
                <input
                  defaultValue={value}
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--hairline-strong)]"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
