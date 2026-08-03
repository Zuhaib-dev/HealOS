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

/* ---------- 03 appointments ---------- */

export function AppointmentsPanel() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);
  const [liveAppointments, setLiveAppointments] = useState<AppointmentRecord[]>([]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetchPatientAppointmentsApi();
      if (res.success && res.appointments) {
        setLiveAppointments(res.appointments);
      }
    } catch (err) {
      console.error("Failed to fetch patient appointments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment booking?")) return;
    try {
      const res = await updateAppointmentStatusApi(id, "CANCELLED");
      if (res.success) {
        toast.success("Appointment cancelled");
        loadAppointments();
      }
    } catch (err) {
      toast.error("Failed to cancel appointment");
    }
  };

  const filteredLive = liveAppointments.filter((a) =>
    tab === "upcoming" ? a.status !== "COMPLETED" && a.status !== "CANCELLED" : a.status === "COMPLETED" || a.status === "CANCELLED"
  );

  return (
    <section>
      <PanelHeader
        index="03 / visits"
        title="Appointments Desk"
        note="Everything scheduled and completed visits with your primary physicians."
        actions={
          <>
            <ActionButton tone={tab === "upcoming" ? "solid" : "ghost"} onClick={() => setTab("upcoming")}>
              Upcoming ({filteredLive.length})
            </ActionButton>
            <ActionButton tone={tab === "past" ? "solid" : "ghost"} onClick={() => setTab("past")}>
              Past / Cancelled ({liveAppointments.length - filteredLive.length})
            </ActionButton>
          </>
        }
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {loading ? (
          <div className="bg-background p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
            Loading scheduled appointments...
          </div>
        ) : filteredLive.length > 0 ? (
          filteredLive.map((a) => (
            <div key={a._id} className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
              <div className="w-28 shrink-0">
                <p className="mono-label text-brass font-bold">{a.date}</p>
                <p className="mono-label text-muted-foreground">{a.timeSlot}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{a.reason}</p>
                <p className="mono-label text-muted-foreground mt-1">
                  {a.department} · Dr. {a.doctor.name} ({a.type})
                </p>
                {a.notes && (
                  <p className="text-xs text-emerald-500 font-mono mt-1">
                    Doctor Note: {a.notes}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`mono-label text-xs px-2.5 py-1 uppercase font-bold ${
                  a.status === "CONFIRMED"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : a.status === "COMPLETED"
                    ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                    : a.status === "CANCELLED"
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }`}
              >
                {a.status}
              </Badge>
              {a.status === "PENDING" || a.status === "CONFIRMED" ? (
                <button
                  type="button"
                  onClick={() => handleCancel(a._id)}
                  className="hairline mono-label text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded text-xs transition-colors"
                >
                  Cancel Visit
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <div className="bg-background p-8 text-center mono-label text-xs text-muted-foreground">
            No {tab} appointments found.
          </div>
        )}
      </div>
    </section>
  );
}
