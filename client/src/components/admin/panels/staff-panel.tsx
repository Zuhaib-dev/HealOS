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
} from "../admin-data";
import { ActionButton, PanelHeader } from "../admin-shell";

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


/* ---------- 03 staff ---------- */

export function StaffPanel() {
  const [filter, setFilter] = useState("All");
  const depts = useMemo(() => ["All", ...new Set(staff.map((s) => s.dept))], []);
  const rows = filter === "All" ? staff : staff.filter((s) => s.dept === filter);

  return (
    <section>
      <PanelHeader
        index="03 / STAFF"
        title="Staff & access control"
        note="Roles, scoped permissions and live workload per member of the establishment."
        actions={<ActionButton tone="solid">Invite staff</ActionButton>}
      />
      <div className="hairline-b flex flex-wrap gap-1 px-5 py-3 sm:px-8">
        {depts.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d)}
            className={`mono-label px-3 py-1.5 ${
              filter === d ? "bg-accent/12 text-brass" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>ID</Th>
            <Th>Member</Th>
            <Th>Access scope</Th>
            <Th>State</Th>
            <Th>Load</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="hairline-b">
              <Td>
                <span className="mono-label text-muted-foreground">{s.id}</span>
              </Td>
              <Td>
                <p className="font-medium">{s.name}</p>
                <p className="mono-label text-muted-foreground">
                  {s.role} · {s.dept}
                </p>
              </Td>
              <Td>
                <Pill tone={s.access === "Full" ? "ok" : "warn"}>{s.access}</Pill>
              </Td>
              <Td>
                <Pill
                  tone={s.state === "Active" ? "ok" : s.state === "Suspended" ? "bad" : "mute"}
                >
                  {s.state}
                </Pill>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="bg-foreground/[0.07] h-1.5 w-24">
                    <motion.div
                      className="bg-accent h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${s.load}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="mono-label text-muted-foreground">{s.load}%</span>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TablePanel>
    </section>
  );
}
