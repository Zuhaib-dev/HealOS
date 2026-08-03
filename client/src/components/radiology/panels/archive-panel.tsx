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
import {
  worklist,
  documents,
  reportTemplates,
  modalities,
  criticalFindings,
  tatStats,
  bookingSlots,
  type WorklistItem,
} from "./radiology-data";
import { fetchPendingOrdersApi, updateOrderStatusApi, uploadDiagnosticReportApi, DiagnosticOrderRecord } from "@/lib/api/radiology";
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

/* ---------- 04 archive ---------- */

export function ArchivePanel() {
  const [q, setQ] = useState("");
  const rows = documents.filter((d) =>
    `${d.name} ${d.patient} ${d.accession}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section>
      <PanelHeader
        index="04 / archive"
        title="Study archive"
        note="Every document attached to a study — reports, scanned requests, priors and DICOM series — with state, uploader and share controls."
        actions={
          <>
            <ActionButton>Export index</ActionButton>
            <ActionButton tone="solid">Bulk verify</ActionButton>
          </>
        }
      />

      <div className="hairline-b px-5 py-4 sm:px-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by file, patient or accession"
          className="hairline mono-label placeholder:text-muted-foreground w-full max-w-md bg-transparent px-3 py-2.5 outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-225">
          <thead className="hairline-b">
            <tr>
              <Th>File</Th>
              <Th>Type</Th>
              <Th>Patient / accession</Th>
              <Th>Size</Th>
              <Th>Uploaded</Th>
              <Th>State</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="hairline-b hover:bg-foreground/2">
                <Td>
                  <span className="flex items-center gap-2">
                    <FileText className="text-accent size-3.5" />
                    <span className="font-mono text-sm">{d.name}</span>
                  </span>
                  {d.pages > 0 && (
                    <p className="mono-label text-muted-foreground mt-1">{d.pages} pages</p>
                  )}
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{d.kind}</span>
                </Td>
                <Td>
                  <p>{d.patient}</p>
                  <p className="mono-label text-muted-foreground">{d.accession}</p>
                </Td>
                <Td>
                  <span className="mono-label">{d.size}</span>
                </Td>
                <Td>
                  <p className="mono-label">{d.uploaded}</p>
                  <p className="mono-label text-muted-foreground">{d.by}</p>
                </Td>
                <Td>
                  <Pill
                    tone={
                      d.state === "verified" ? "ok" : d.state === "pending sign" ? "warn" : "bad"
                    }
                  >
                    {d.state}
                  </Pill>
                </Td>
                <Td>
                  <div className="text-muted-foreground flex items-center gap-3">
                    <button type="button" aria-label="Preview" className="hover:text-foreground">
                      <Eye className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Download" className="hover:text-foreground">
                      <Download className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Share" className="hover:text-foreground">
                      <Share2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      className="hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
