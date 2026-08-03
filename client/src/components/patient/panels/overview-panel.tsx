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
} from "./patient-data";
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

/* ---------- 01 overview ---------- */

export function OverviewPanel() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchPatientProfileApi()
      .then((res) => {
        if (isMounted && res.success) {
          setProfile(res.profile);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const userName = user?.name || "Patient";
  const userFirstName = userName.split(" ")[0];
  const userRole = user?.role || "PATIENT";
  const allergiesList = profile?.allergies?.length ? profile.allergies : ["No known drug allergies"];
  const bloodGroup = profile?.bloodGroup || "O+";

  return (
    <section>
      <PanelHeader
        index="01 / my health"
        title={`Hello, ${userFirstName}`}
        note={`Role: ${userRole} · Email: ${user?.email || "N/A"} · Blood Group: ${bloodGroup}`}
        actions={
          <>
            <ActionButton tone="solid">Verified Health Account</ActionButton>
          </>
        }
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5 lg:col-span-2">
          <p className="mono-label text-muted-foreground">Logged-In Profile Status</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight">
            {userName}
          </p>
          <p className="mono-label text-muted-foreground mt-2">
            Phone: {user?.phone || profile?.emergencyPhone || "Not set"} · Emergency Contact: {profile?.emergencyContactName || "Not set"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton tone="solid">Profile Verified</ActionButton>
          </div>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Account Health Alerts</p>
          <ul className="mt-3 space-y-3">
            {[
              { t: `Account Email: ${user?.email}`, tone: "ok" as const },
              { t: `Role Designation: ${userRole}`, tone: "warn" as const },
              { t: `Blood Group: ${bloodGroup}`, tone: "ok" as const },
            ].map((i) => (
              <li key={i.t} className="flex items-center gap-3">
                <Pill tone={i.tone}>·</Pill>
                <span className="text-sm">{i.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="hairline-t grid gap-px sm:grid-cols-2 xl:grid-cols-4"
        style={{ background: "var(--hairline)" }}
      >
        {vitals.map((v) => (
          <div key={v.label} className="bg-background p-5">
            <p className="mono-label text-muted-foreground">{v.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight">
              {v.value}
              <span className="text-muted-foreground ml-1 text-sm font-normal">{v.unit}</span>
            </p>
            <Trend series={v.series} />
            <p className="mono-label text-muted-foreground">{v.note}</p>
          </div>
        ))}
      </div>

      <div className="hairline-t grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Allergies &amp; alerts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allergiesList.map((a) => (
              <span key={a} className="mono-label bg-destructive/12 text-destructive px-2 py-1">
                <TriangleAlert className="mr-1 inline size-3" />
                {a}
              </span>
            ))}
          </div>
          <p className="mono-label text-muted-foreground mt-5">Ongoing conditions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {patient.conditions.map((c) => (
              <Pill key={c} tone="warn">
                {c}
              </Pill>
            ))}
          </div>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Care team</p>
          <div className="mt-3 flex flex-col gap-3">
            {careTeam.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="bg-accent/12 text-brass mono-label grid size-8 shrink-0 place-items-center">
                  {c.name
                    .replace("Dr. ", "")
                    .replace("Sr. ", "")
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm">{c.name}</p>
                  <p className="mono-label text-muted-foreground">
                    {c.role} · {c.contact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
