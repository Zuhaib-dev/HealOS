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

/* ---------- 02 book ---------- */

export function BookPanel() {
  const [dept, setDept] = useState(departments[0]!);
  const [doctorsList, setDoctorsList] = useState<DoctorListItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<"IN_PERSON" | "TELECONSULT">("IN_PERSON");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");
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
        paymentMethod,
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
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/3"
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

            <p className="mono-label text-muted-foreground mt-5">4. Payment Method</p>
            <div className="mt-2 flex gap-2">
              {(["ONLINE", "CASH"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaymentMethod(p)}
                  className={`mono-label flex-1 px-3 py-2.5 text-xs font-semibold rounded ${
                    paymentMethod === p ? "bg-foreground text-background" : "hairline text-foreground"
                  }`}
                >
                  {p === "ONLINE" ? "Pay Online (₹400)" : "Pay at Desk (₹400)"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background p-5 lg:col-span-2">
            <p className="mono-label text-muted-foreground">5. Appointment Date</p>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              className="hairline mono-label mt-2 bg-background px-3 py-2.5 outline-none rounded text-xs font-semibold"
            />

            <p className="mono-label text-muted-foreground mt-5">6. Available Time Slots</p>
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
                        : "hairline hover:bg-foreground/3"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <p className="mono-label text-muted-foreground mt-5">7. Reason for Visit & Symptoms</p>
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
