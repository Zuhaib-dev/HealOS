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

/* ---------- 02 book ---------- */

export function BookPanel() {
  const [dept, setDept] = useState(departments[0]!);
  const [doctorsList, setDoctorsList] = useState<DoctorListItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<"IN_PERSON" | "TELECONSULT">("IN_PERSON");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedRecord, setBookedRecord] = useState<AppointmentRecord | null>(null);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetchAvailableDoctorsApi();
        if (res.success && res.doctors.length > 0) {
          setDoctorsList(res.doctors);
          setSelectedDoctorId(res.doctors[0]!._id);
        }
      } catch (err) {
        console.error("Failed to load available doctors", err);
      }
    };
    loadDoctors();
  }, []);

  const handleBook = async () => {
    if (!time || !selectedDoctorId || !reason) {
      toast.error("Please select a doctor, time slot, and enter a reason for visit.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await bookAppointmentApi({
        doctorId: selectedDoctorId,
        department: dept.label,
        date,
        timeSlot: time,
        reason,
        type: mode,
      });

      if (res.success && res.appointment) {
        toast.success("Appointment request submitted successfully!");
        setBookedRecord(res.appointment);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctorObj = doctorsList.find((d) => d._id === selectedDoctorId);

  return (
    <section>
      <PanelHeader
        index="02 / new visit"
        title="Book an appointment"
        note="Pick a department, clinician and free slot. You will get a confirmation message and preparation instructions."
      />

      {bookedRecord ? (
        <div className="p-5 sm:p-8">
          <div className="hairline max-w-xl p-6 rounded-lg bg-card/50">
            <Check className="text-emerald-500 size-6" />
            <p className="mt-3 font-mono text-xl font-bold">Appointment Confirmed & Requested</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Appointment for <strong>{bookedRecord.department}</strong> with <strong>Dr. {bookedRecord.doctor.name}</strong> on <strong>{bookedRecord.date}</strong> at <strong>{bookedRecord.timeSlot}</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Status: <span className="text-amber-500 font-bold">{bookedRecord.status}</span> · Visit Type: {bookedRecord.type}
            </p>
            <div className="mt-5 flex gap-2">
              <ActionButton
                tone="solid"
                onClick={() => {
                  setBookedRecord(null);
                  setTime(null);
                  setReason("");
                }}
              >
                Book another visit
              </ActionButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
          <div className="bg-background p-5">
            <p className="mono-label text-muted-foreground">1. Select Department</p>
            <div className="mt-2 flex flex-col gap-0.5">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDept(d)}
                  className={`mono-label px-3 py-2 text-left transition-colors cursor-pointer rounded ${
                    dept.id === d.id
                      ? "bg-accent/15 text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <p className="mono-label text-muted-foreground mt-5">2. Select Clinician / Doctor</p>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="hairline mono-label mt-2 w-full bg-background px-3 py-2.5 outline-none rounded text-xs font-semibold"
            >
              {doctorsList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.specialization})
                </option>
              ))}
            </select>

            <p className="mono-label text-muted-foreground mt-5">3. Visit Type</p>
            <div className="mt-2 flex gap-2">
              {(["IN_PERSON", "TELECONSULT"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`mono-label flex-1 px-3 py-2.5 text-xs font-semibold rounded ${
                    mode === m ? "bg-foreground text-background" : "hairline text-foreground"
                  }`}
                >
                  {m === "IN_PERSON" ? "In Person" : "Video Consultation"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background p-5 lg:col-span-2">
            <p className="mono-label text-muted-foreground">4. Appointment Date</p>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              className="hairline mono-label mt-2 bg-background px-3 py-2.5 outline-none rounded text-xs font-semibold"
            />

            <p className="mono-label text-muted-foreground mt-5">5. Available Time Slots</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {slotTimes.map((t) => {
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`mono-label px-4 py-2.5 text-xs rounded transition-colors cursor-pointer ${
                      time === t
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "hairline hover:bg-foreground/[0.03]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <p className="mono-label text-muted-foreground mt-5">6. Reason for Visit & Symptoms</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Briefly describe your symptoms, chest pain, fever, or health concerns..."
              className="hairline placeholder:text-muted-foreground mt-2 w-full resize-none bg-background p-3 text-sm outline-none rounded"
            />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!time || submitting}
                onClick={handleBook}
                className={`mono-label px-5 py-3 rounded font-semibold text-xs transition-opacity cursor-pointer ${
                  time && !submitting
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "hairline text-muted-foreground cursor-not-allowed opacity-60"
                }`}
              >
                {submitting ? "Booking Appointment..." : "Confirm & Submit Booking →"}
              </button>
              <span className="mono-label text-muted-foreground text-xs">
                {time
                  ? `${dept.label} · ${selectedDoctorObj?.name || "Doctor"} · ${date} ${time}`
                  : "Select a time slot to continue"}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
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

/* ---------- 04 reports ---------- */

export function ReportsPanel() {
  const [q, setQ] = useState("");
  const rows = reports.filter((r) =>
    `${r.name} ${r.kind} ${r.dept}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section>
      <PanelHeader
        index="04 / records"
        title="Reports &amp; records"
        note="Lab and imaging reports, clinic letters, prescriptions and invoices — view, download or share with an outside doctor."
        actions={<ActionButton tone="solid">Download all as ZIP</ActionButton>}
      />

      <div className="hairline-b flex flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter reports"
          className="hairline mono-label placeholder:text-muted-foreground w-full max-w-sm bg-transparent px-3 py-2.5 outline-none"
        />
        <span className="mono-label text-muted-foreground">
          {reports.filter((r) => r.flagged).length} results outside reference range
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="hairline-b">
            <tr>
              <Th>Document</Th>
              <Th>Type</Th>
              <Th>Department</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hairline-b hover:bg-foreground/[0.02]">
                <Td>
                  <span className="flex items-center gap-2">
                    <FileText className="text-accent size-3.5 shrink-0" />
                    <span className="font-mono text-sm">{r.name}</span>
                    {r.flagged && <Pill tone="bad">abnormal</Pill>}
                  </span>
                  {r.pages > 0 && (
                    <p className="mono-label text-muted-foreground mt-1">
                      {r.pages} pages · {r.size}
                    </p>
                  )}
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{r.kind}</span>
                </Td>
                <Td>
                  <span className="mono-label">{r.dept}</span>
                </Td>
                <Td>
                  <span className="mono-label">{r.date}</span>
                </Td>
                <Td>
                  <Pill
                    tone={r.status === "ready" ? "ok" : r.status === "awaiting sign" ? "warn" : "mute"}
                  >
                    {r.status}
                  </Pill>
                </Td>
                <Td>
                  <div className="text-muted-foreground flex items-center gap-3">
                    <button type="button" aria-label="View" className="hover:text-foreground">
                      <Eye className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Download" className="hover:text-foreground">
                      <Download className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Share" className="hover:text-foreground">
                      <Share2 className="size-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hairline-t p-5 sm:p-8">
        <div className="hairline flex flex-wrap items-center gap-4 p-5">
          <UploadCloud className="text-accent size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bring your own documents</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Outside reports, old prescriptions or insurance papers — add them so your team sees
              them before the visit. PDF or photo, up to 25 MB.
            </p>
          </div>
          <ActionButton tone="solid">Upload document</ActionButton>
        </div>
      </div>
    </section>
  );
}

/* ---------- 05 meds ---------- */

export function MedsPanel() {
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  return (
    <section>
      <PanelHeader
        index="05 / medications"
        title="My medications"
        note="What you are taking, who prescribed it, and how many repeats are left. Request a refill and the pharmacy will confirm."
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {meds.map((m) => (
          <div
            key={m.name}
            className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="mono-label text-muted-foreground mt-1">
                {m.dose} · {m.freq} · since {m.started} · {m.prescriber}
              </p>
            </div>
            <Pill tone={m.state === "active" ? "ok" : "mute"}>{m.state}</Pill>
            <Pill tone={m.refillsLeft === 0 ? "bad" : "warn"}>{m.refillsLeft} repeats</Pill>
            {m.state === "active" && (
              <ActionButton
                tone={requested[m.name] ? "ghost" : "solid"}
                onClick={() => setRequested((p) => ({ ...p, [m.name]: true }))}
              >
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="size-3" />
                  {requested[m.name] ? "Refill requested" : "Request refill"}
                </span>
              </ActionButton>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 06 billing ---------- */

export function BillingPanel() {
  return (
    <section>
      <PanelHeader
        index="06 / billing"
        title="Bills &amp; insurance"
        note="Every invoice with what your insurer covered and what is left for you to pay."
        actions={<ActionButton tone="solid">Pay outstanding ₹650</ActionButton>}
      />

      <div className="grid gap-px sm:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {[
          { label: "Outstanding", value: "₹650", note: "1 invoice due" },
          { label: "With insurer", value: "₹2,480", note: "claim in review" },
          { label: "Paid this year", value: "₹4,100", note: "3 invoices" },
        ].map((s) => (
          <div key={s.label} className="bg-background p-5">
            <p className="mono-label text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="mono-label text-muted-foreground mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="hairline-t overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="hairline-b">
            <tr>
              <Th>Invoice</Th>
              <Th>Date</Th>
              <Th>Item</Th>
              <Th>Total</Th>
              <Th>Insurer</Th>
              <Th>You pay</Th>
              <Th>State</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} className="hairline-b hover:bg-foreground/[0.02]">
                <Td>
                  <span className="mono-label">{b.ref}</span>
                </Td>
                <Td>
                  <span className="mono-label">{b.date}</span>
                </Td>
                <Td>{b.item}</Td>
                <Td>
                  <span className="mono-label">{b.amount}</span>
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{b.insurerShare}</span>
                </Td>
                <Td>
                  <span className="mono-label">{b.due}</span>
                </Td>
                <Td>
                  <Pill tone={b.state === "paid" ? "ok" : b.state === "due" ? "bad" : "warn"}>
                    {b.state}
                  </Pill>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <ActionButton>Receipt</ActionButton>
                    {b.state === "due" && <ActionButton tone="solid">Pay</ActionButton>}
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

/* ---------- 07 messages ---------- */

export function MessagesPanel() {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);

  return (
    <section>
      <PanelHeader
        index="07 / messages"
        title="Messages"
        note="Non-urgent questions to your care team. For anything urgent call the hospital or attend the emergency department."
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        <div className="bg-background lg:col-span-2">
          <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
            {messages.map((m) => (
              <div key={m.id} className="bg-background p-5 sm:px-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-accent/12 text-brass mono-label grid size-8 place-items-center">
                    {m.from
                      .replace("Dr. ", "")
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{m.from}</p>
                    <p className="mono-label text-muted-foreground">
                      {m.role} · {m.at}
                    </p>
                  </div>
                  {m.unread && <Pill tone="warn">new</Pill>}
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{m.body}</p>
              </div>
            ))}
            {sent.map((s, i) => (
              <div key={`sent-${i}`} className="bg-background p-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="bg-foreground/[0.06] mono-label grid size-8 place-items-center">
                    ME
                  </span>
                  <div>
                    <p className="text-sm font-medium">You</p>
                    <p className="mono-label text-muted-foreground">sent just now</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">New message</p>
          <select className="hairline mono-label mt-2 w-full bg-transparent px-3 py-2.5 outline-none">
            {careTeam.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder="Type your question"
            className="hairline placeholder:text-muted-foreground mt-3 w-full resize-none bg-transparent p-3 text-sm outline-none"
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => {
              setSent((p) => [...p, draft.trim()]);
              setDraft("");
            }}
            className={`mono-label mt-3 w-full px-4 py-2.5 ${
              draft.trim()
                ? "bg-foreground text-background hover:opacity-85"
                : "hairline text-muted-foreground cursor-not-allowed"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Send className="size-3.5" />
              Send message
            </span>
          </button>
          <p className="mono-label text-muted-foreground mt-3">
            replies usually within one working day
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 08 profile ---------- */

export function ProfilePanel() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [bloodGroup, setBloodGroup] = useState<"A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-">("O+");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [allergies, setAllergies] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchPatientProfileApi()
      .then((res) => {
        if (res.success && res.profile) {
          if (res.profile.dob) setDob(res.profile.dob);
          if (res.profile.gender) setGender(res.profile.gender);
          if (res.profile.bloodGroup) setBloodGroup(res.profile.bloodGroup);
          if (res.profile.emergencyPhone) setEmergencyPhone(res.profile.emergencyPhone);
          if (res.profile.emergencyContactName) setEmergencyContactName(res.profile.emergencyContactName);
          if (res.profile.allergies) setAllergies(res.profile.allergies.join(", "));
          if (res.profile.address) setAddress(res.profile.address);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const allergyArr = allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await updatePatientProfileApi({
        dob,
        gender,
        bloodGroup,
        emergencyPhone,
        emergencyContactName,
        allergies: allergyArr,
        address,
      });

      if (res.success) {
        toast.success("Patient profile updated successfully in MongoDB Atlas!");
        if (emergencyPhone && user) {
          updateUser({ phone: emergencyPhone });
        }
      }
    } catch {
      toast.error("Failed to update patient profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <form onSubmit={handleSave}>
        <PanelHeader
          index="08 / profile"
          title="My Profile"
          note="Live contact details and health records stored in your MongoDB Atlas account."
          actions={
            <ActionButton tone="solid" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </ActionButton>
          }
        />

        <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
          <div className="bg-background p-5">
            <p className="mono-label text-muted-foreground">Personal Information</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mono-label text-muted-foreground">Full Name</span>
                <input
                  readOnly
                  value={user?.name || ""}
                  className="hairline mt-2 w-full bg-muted/30 px-3 py-2.5 text-sm outline-none cursor-not-allowed"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mono-label text-muted-foreground">Email Address</span>
                <input
                  readOnly
                  value={user?.email || ""}
                  className="hairline mt-2 w-full bg-muted/30 px-3 py-2.5 text-sm outline-none cursor-not-allowed"
                />
              </label>

              <label className="block">
                <span className="mono-label text-muted-foreground">Date of Birth</span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="mono-label text-muted-foreground">Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>

              <label className="block">
                <span className="mono-label text-muted-foreground">Blood Group</span>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as any)}
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </label>

              <label className="block">
                <span className="mono-label text-muted-foreground">Emergency Contact Name</span>
                <input
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Primary contact name"
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mono-label text-muted-foreground">Emergency Phone Number</span>
                <input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mono-label text-muted-foreground">Known Allergies (Comma Separated)</span>
                <input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Penicillin, Dust Mites, Peanuts"
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mono-label text-muted-foreground">Residential Address</span>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full address"
                  className="hairline mt-2 w-full bg-transparent p-3 text-sm outline-none resize-none"
                />
              </label>
            </div>
          </div>

          <div className="bg-background p-5">
            <p className="mono-label text-muted-foreground">Account Status</p>
            <div className="mt-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="font-semibold text-sm text-foreground">Role: {user?.role}</p>
              <p className="mono-label text-xs text-muted-foreground mt-1">
                Verified Status: {user?.isEmailVerified ? "Verified ✓" : "Pending Verification"}
              </p>
            </div>

            <p className="mono-label text-muted-foreground mt-6">Consent &amp; Data Security</p>
            <ul className="mt-3 space-y-3">
              {[
                { t: "Share records with assigned clinicians", on: true },
                { t: "SMS & Email reminders before appointments", on: true },
                { t: "HIPAA Compliant Data Encryption", on: true },
              ].map((c) => (
                <li key={c.t} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{c.t}</span>
                  <span
                    className={`mono-label px-2 py-1 ${
                      c.on ? "bg-accent/12 text-brass font-mono" : "bg-foreground/[0.04] text-muted-foreground"
                    }`}
                  >
                    {c.on ? "active" : "off"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </form>
    </section>
  );
}
