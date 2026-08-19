import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Download,
  Eye,
  FileText,
  Share2,
  TriangleAlert,
  Video,
  MapPin,
  X,
  Send,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  fetchAvailableDoctorsApi,
  bookAppointmentApi,
  fetchPatientAppointmentsApi,
  updateAppointmentStatusApi,
  DoctorListItem,
  AppointmentRecord,
} from "@/lib/api/appointment";
import {
  fetchPatientProfileApi,
  updatePatientProfileApi,
  PatientProfileData,
} from "@/lib/api/onboarding";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { fetchPatientDashboardApi, PatientDashboardData, payInvoiceApi } from "@/lib/api/patient";
import { getSocket } from "@/lib/socket";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";

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

/** Animated trend line — drawn, never an image. */
function Trend({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 30 - ((v - min) / Math.max(0.001, max - min)) * 24 - 3;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full">
      <motion.polyline
        points={pts}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

/* ---------- 05 meds ---------- */

export function MedsPanel() {
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const { data, isLoading } = usePatientDashboard();

  const activeMeds = (data?.consultations || []).flatMap(c => 
    (c.medicines || []).map((m: any) => ({
      name: m.name,
      dose: m.dosage,
      freq: m.frequency,
      started: new Date(c.createdAt).toLocaleDateString(),
      prescriber: c.doctor?.name ? `Dr. ${c.doctor.name}` : "Doctor",
      state: "active",
      refillsLeft: 0,
      instructions: m.instructions
    }))
  );

  return (
    <section>
      <PanelHeader
        index="05 / medications"
        title="My medications"
        note="What you are taking, who prescribed it, and how many repeats are left. Request a refill and the pharmacy will confirm."
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {activeMeds.length === 0 && (
          <div className="bg-background p-8 text-center mono-label text-xs text-muted-foreground">
            No active medications found.
          </div>
        )}
        {activeMeds.map((m, i) => (
          <div
            key={i}
            className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="mono-label text-muted-foreground mt-1">
                {m.dose} · {m.freq} · since {m.started} · {m.prescriber}
              </p>
              {m.instructions && (
                <p className="text-xs text-emerald-500 font-mono mt-1">Instructions: {m.instructions}</p>
              )}
            </div>
            <Pill tone={m.state === "active" ? "ok" : "mute"}>{m.state}</Pill>
            <Pill tone="warn">Contact doctor for refills</Pill>
          </div>
        ))}
      </div>
    </section>
  );
}
