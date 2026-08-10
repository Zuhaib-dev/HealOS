import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  UploadCloud,
  FileText,
  X,
  Check,
  TriangleAlert,
  PhoneCall,
  Download,
  Share2,
  Trash2,
  Eye,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import { fetchCriticalFindingsApi, CriticalFindingRecord } from "@/lib/api/radiology";
import { toast } from "sonner";

/* ---------- primitives ---------- */

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
  );
}

function Td({ children, colSpan, className }: { children?: React.ReactNode, colSpan?: number, className?: string }) {
  return <td colSpan={colSpan} className={`px-4 py-3.5 align-middle text-sm ${className || ""}`}>{children}</td>;
}

/** Animated scanner glyph — hand-drawn SVG, no raster assets. */
function ScannerGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full">
      <rect
        x="8"
        y="12"
        width="104"
        height="48"
        fill="none"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      <circle cx="60" cy="36" r="17" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="36" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.8" />
      {active && (
        <motion.line
          x1="8"
          x2="112"
          y1="14"
          y2="14"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          animate={{ y1: [14, 58, 14], y2: [14, 58, 14] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}

/* ---------- 05 critical findings ---------- */

export function CriticalPanel() {
  const [findings, setFindings] = useState<CriticalFindingRecord[]>([]);
  const [called, setCalled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCriticalFindingsApi().then(res => {
      setFindings(res.data.findings);
      setCalled(Object.fromEntries(res.data.findings.map(c => [c.accession, c.called])));
    }).catch(console.error);
  }, []);

  return (
    <section>
      <PanelHeader
        index="05 / escalation"
        title="Critical findings"
        note="Closed-loop communication: a critical result is not done until a named clinician has acknowledged it by voice."
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {findings.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground">No critical findings to display.</div>
        ) : findings.map((c) => {
          const ack = called[c.accession];
          return (
            <div
              key={c._id}
              className="bg-background flex flex-wrap items-center gap-4 p-5 sm:px-8"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${
                  ack ? "bg-accent" : "bg-destructive animate-pulse"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.finding}</p>
                <p className="mono-label text-muted-foreground mt-1">
                  {c.accession} · {c.patientName} · flagged {c.atTime} · to {c.clinician}
                </p>
              </div>
              <Pill tone={ack ? "ok" : "bad"}>{ack ? "acknowledged" : "callback pending"}</Pill>
              <ActionButton
                tone={ack ? "ghost" : "solid"}
                onClick={() => {
                  setCalled((p) => ({ ...p, [c.accession]: true }));
                  toast.success(`Marked as called: ${c.accession}`);
                  // Note: In a real app we would call a PUT endpoint here to update `called: true`
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <PhoneCall className="size-3.5" />
                  {ack ? "Log repeat call" : "Mark called"}
                </span>
              </ActionButton>
            </div>
          );
        })}
      </div>
    </section>
  );
}
