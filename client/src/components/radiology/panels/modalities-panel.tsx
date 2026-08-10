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
import { fetchModalitiesApi, ModalityMachineRecord } from "@/lib/api/radiology";
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

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function priorityTone(p: DiagnosticOrderRecord["priority"]) {
  return p === "STAT" ? "bad" : p === "URGENT" ? "warn" : "mute";
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

/* ---------- 06 modalities ---------- */

export function ModalitiesPanel() {
  const [modalities, setModalities] = useState<ModalityMachineRecord[]>([]);

  useEffect(() => {
    fetchModalitiesApi().then(res => setModalities(res.data.modalities)).catch(console.error);
  }, []);

  return (
    <section>
      <PanelHeader
        index="06 / equipment"
        title="Modalities &amp; dose"
        note="Scanner state, queue depth, uptime, dose index and next service window for every room in the department."
      />

      <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {modalities.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground col-span-full">Loading equipment...</div>
        ) : modalities.map((m) => (
          <div key={m._id} className="bg-background p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg">{m.room}</p>
                <p className="mono-label text-muted-foreground">
                  {m.modality} · {m.vendor}
                </p>
              </div>
              <Pill
                tone={
                  m.state === "scanning"
                    ? "ok"
                    : m.state === "idle"
                      ? "mute"
                      : m.state === "maintenance"
                        ? "warn"
                        : "bad"
                }
              >
                {m.state}
              </Pill>
            </div>

            <ScannerGlyph active={m.state === "scanning"} />

            <dl className="mono-label mt-3 grid grid-cols-2 gap-y-2">
              <dt className="text-muted-foreground">Queue</dt>
              <dd className="text-right">{m.queue} studies</dd>
              <dt className="text-muted-foreground">Uptime 30d</dt>
              <dd className="text-right">{m.uptime}</dd>
              <dt className="text-muted-foreground">Dose index</dt>
              <dd className="text-right">{m.doseIndex}</dd>
              <dt className="text-muted-foreground">Next service</dt>
              <dd className="text-right">{m.nextService}</dd>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
