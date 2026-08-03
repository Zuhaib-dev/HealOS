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
import {
  patient,
  upcoming,
  history,
  departments,
  slotTimes,
  bookedTimes,
  reports,
  meds,
  bills,
  vitals,
  messages,
  careTeam,
  type Appointment,
} from "../patient-data";
import { fetchPatientDashboardApi, PatientDashboardData, payInvoiceApi } from "@/lib/api/patient";
import { getSocket } from "@/lib/socket";

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

function stateTone(s: Appointment["state"]) {
  if (s === "confirmed" || s === "completed") return "ok";
  if (s === "pending") return "warn";
  return "bad";
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

function AppointmentRow({ a, actions }: { a: Appointment; actions?: React.ReactNode }) {
  return (
    <div className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
      <div className="w-28 shrink-0">
        <p className="mono-label text-brass">{a.date}</p>
        <p className="mono-label text-muted-foreground">{a.time}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{a.reason}</p>
        <p className="mono-label text-muted-foreground mt-1">
          {a.dept} · {a.clinician}
        </p>
      </div>
      <span className="mono-label text-muted-foreground hidden items-center gap-1.5 sm:flex">
        {a.mode === "Video" ? <Video className="size-3" /> : <MapPin className="size-3" />}
        {a.room}
      </span>
      <Pill tone={stateTone(a.state)}>{a.state}</Pill>
      {actions}
    </div>
  );
}

/* ---------- 05 meds ---------- */

export function MedsPanel() {
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PatientDashboardData | null>(null);

  useEffect(() => {
    fetchPatientDashboardApi().then(res => {
      if (res.status === "success") setData(res.data);
    }).catch(() => {});
  }, []);

  const activeMeds = (data?.consultations || []).flatMap(c => 
    (c.medicines || []).map((m: any) => ({
      name: m.name,
      dose: m.dosage,
      freq: m.frequency,
      started: new Date(c.createdAt).toLocaleDateString(),
      prescriber: c.doctor?.firstName ? `Dr. ${c.doctor.firstName} ${c.doctor.lastName}` : "Doctor",
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
