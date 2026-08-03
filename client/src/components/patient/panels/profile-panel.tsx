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
                      c.on ? "bg-accent/12 text-brass font-mono" : "bg-foreground/4 text-muted-foreground"
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
