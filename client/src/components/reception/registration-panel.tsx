"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * states: default · hover · focus · active · disabled · loading · error · success
 */

import { useEffect, useState } from "react";
import { UserPlus, Check, AlertCircle, Loader2, Printer } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { registerPatientApi } from "@/lib/api/reception";
import {
  fetchAvailableDoctorsApi,
  fetchDoctorAvailabilityApi,
  type DoctorListItem,
} from "@/lib/api/appointment";
import { toast } from "sonner";
import { ReceptionHeader } from "@/components/reception/reception-header";
import { formatTime12Hour } from "@/lib/time-format";

const FALLBACK_DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Orthopedics",
  "Pediatrics",
  "Neurology",
];

type IssuedSlip = {
  token: string;
  patient: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  appointment: {
    department: string;
    date: string;
    timeSlot: string;
    doctor?: { name?: string };
  };
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  id,
  required,
  autoFocus,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  id: string;
  required?: boolean;
  autoFocus?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "email";
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mono-label mb-1.5 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          type={type}
          inputMode={inputMode}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
            error ? "border-destructive/60" : "border-border/60"
          }`}
        />
        {error ? (
          <AlertCircle className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-destructive" />
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceRow({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mono-label mb-2 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}

function choiceClass(active: boolean) {
  return `px-3 py-2 text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    active
      ? "bg-primary border-primary text-primary-foreground"
      : "bg-background border-border/60 text-muted-foreground hover:bg-muted"
  }`;
}

export function RegistrationPanel() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    department: "",
    doctorId: "",
    timeSlot: "",
    reason: "",
    payer: "self",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<IssuedSlip | null>(null);
  const [departments, setDepartments] =
    useState<string[]>(FALLBACK_DEPARTMENTS);
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [availableSlots, setAvailableSlots] = useState<
    Array<{ start: string; end: string }>
  >([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const departmentDoctors = doctors.filter(
    (doctor) =>
      doctor.specialization.trim().toLowerCase() ===
      form.department.trim().toLowerCase(),
  );

  useEffect(() => {
    fetchAvailableDoctorsApi()
      .then((res) => {
        if (res.success && res.doctors.length > 0) {
          setDoctors(res.doctors);
          const depts = Array.from(
            new Set(res.doctors.map((d) => d.specialization)),
          );
          const next = depts.length > 0 ? depts : FALLBACK_DEPARTMENTS;
          setDepartments(next);
          setForm((f) => ({
            ...f,
            department: f.department || next[0] || "General Medicine",
          }));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setAvailableSlots([]);
    if (!form.doctorId) return;
    let active = true;
    setSlotsLoading(true);
    fetchDoctorAvailabilityApi(form.doctorId, today)
      .then((res) => {
        if (active) {
          const slots = res.available ? res.availableSlots || [] : [];
          setAvailableSlots(slots);
          setForm((current) => ({
            ...current,
            timeSlot: slots.some((slot) => slot.start === current.timeSlot)
              ? current.timeSlot
              : "",
          }));
        }
      })
      .catch(() => {
        if (active) setAvailableSlots([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form.doctorId, today]);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\+?[\d\s-]{10,}$/.test(form.phone))
      newErrors.phone = "Enter a valid phone number";
    if (!form.gender) newErrors.gender = "Select sex";
    if (!form.department) newErrors.department = "Select a department";
    if (!form.doctorId) newErrors.doctorId = "Select a doctor";
    if (!form.timeSlot) newErrors.timeSlot = "Select an available time";
    if (form.reason.trim().length < 3)
      newErrors.reason = "Enter a short reason for the visit";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      toast.error("Fix the highlighted fields, then try again.");
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await registerPatientApi({ ...form, date: today });
      if (res.status === "success") {
        setIssued(res.data);
        toast.success("Patient registered. Token issued.");
        setForm({
          firstName: "",
          lastName: "",
          phone: "",
          dateOfBirth: "",
          gender: "",
          address: "",
          department: departments[0] || "General Medicine",
          payer: "self",
          doctorId: "",
          timeSlot: "",
          reason: "",
        });
      }
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      toast.error(message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const patientName =
    issued?.patient.name ||
    [issued?.patient.firstName, issued?.patient.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Patient";

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-28 lg:pb-0">
      <ReceptionHeader
        title="New registration"
        note="Register the patient, record the visit reason, choose a doctor and live appointment time, then issue the OPD token."
      />

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <form
          className="min-w-0 border-b border-border/60 p-4 sm:p-6 lg:border-r lg:border-b-0 lg:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            void handleRegister();
          }}
        >
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Field
              id="reg-first-name"
              label="First name"
              required
              autoFocus
              value={form.firstName}
              onChange={(val) => {
                setForm({ ...form, firstName: val });
                clearError("firstName");
              }}
              placeholder="Priya"
              error={errors.firstName}
            />
            <Field
              id="reg-last-name"
              label="Last name"
              value={form.lastName}
              onChange={(val) => setForm({ ...form, lastName: val })}
              placeholder="Nair"
            />
            <Field
              id="reg-phone"
              label="Mobile"
              required
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(val) => {
                setForm({ ...form, phone: val });
                clearError("phone");
              }}
              placeholder="+91"
              error={errors.phone}
            />
            <Field
              id="reg-dob"
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(val) => setForm({ ...form, dateOfBirth: val })}
            />
            <div className="sm:col-span-2">
              <Field
                id="reg-address"
                label="Address"
                value={form.address}
                onChange={(val) => setForm({ ...form, address: val })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="mt-6 max-w-2xl space-y-6">
            <ChoiceRow label="Sex" required error={errors.gender}>
              {["Female", "Male"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, gender: g });
                    clearError("gender");
                  }}
                  className={choiceClass(form.gender === g)}
                >
                  {g}
                </button>
              ))}
            </ChoiceRow>

            <ChoiceRow label="Department" required error={errors.department}>
              {departments.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      department: d,
                      doctorId: "",
                      timeSlot: "",
                    });
                    clearError("department");
                  }}
                  className={choiceClass(form.department === d)}
                >
                  {d}
                </button>
              ))}
            </ChoiceRow>

            <div className="max-w-2xl">
              <label
                htmlFor="reg-doctor"
                className="mono-label mb-1.5 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Assigned doctor <span className="text-destructive">*</span>
              </label>
              <select
                id="reg-doctor"
                value={form.doctorId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    doctorId: event.target.value,
                    timeSlot: "",
                  })
                }
                className="w-full border border-border/60 bg-background px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">
                  Choose a doctor in {form.department || "this department"}
                </option>
                {departmentDoctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name} · {doctor.specialization}
                  </option>
                ))}
              </select>
              {errors.doctorId ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.doctorId}
                </p>
              ) : null}
              {form.department && departmentDoctors.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  No bookable doctor is listed for this department.
                </p>
              ) : null}
            </div>

            <ChoiceRow
              label={`Available times today · ${today}`}
              required
              error={errors.timeSlot}
            >
              {slotsLoading ? (
                <span className="text-xs text-muted-foreground">
                  Loading doctor availability…
                </span>
              ) : availableSlots.length ? (
                availableSlots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    aria-pressed={form.timeSlot === slot.start}
                    onClick={() => setForm({ ...form, timeSlot: slot.start })}
                    className={choiceClass(form.timeSlot === slot.start)}
                  >
                    {formatTime12Hour(slot.start)}
                  </button>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  {form.doctorId
                    ? "No future appointment times remain today."
                    : "Select a doctor to see today's times."}
                </span>
              )}
            </ChoiceRow>

            <Field
              id="reg-visit-reason"
              label="Reason for visit"
              required
              value={form.reason}
              onChange={(reason) => setForm({ ...form, reason })}
              placeholder="Symptoms, follow-up, or consultation reason"
              error={errors.reason}
            />

            <ChoiceRow label="Payer">
              {[
                { id: "self", label: "Self pay" },
                { id: "insurance", label: "Insurance / TPA" },
                { id: "corporate", label: "Corporate" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm({ ...form, payer: p.id })}
                  className={choiceClass(form.payer === p.id)}
                >
                  {p.label}
                </button>
              ))}
            </ChoiceRow>
          </div>

          <div className="fixed right-0 bottom-16 left-0 z-30 border-t border-border/60 bg-background/95 p-3 backdrop-blur-md md:bottom-0 lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <ActionButton
              type="submit"
              tone="solid"
              disabled={loading}
              className="w-full justify-center px-6 py-3 text-sm lg:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Registering…
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 inline size-4" />
                  Register & book walk-in
                </>
              )}
            </ActionButton>
          </div>
        </form>

        <aside className="flex min-w-0 flex-col bg-card/20 p-4 sm:p-6 lg:p-8 print:bg-background">
          <h2 className="mb-4 font-display text-sm font-bold tracking-tight text-muted-foreground">
            Token slip
          </h2>

          {issued ? (
            <div className="relative border border-border/60 bg-background p-5 sm:p-6">
              <div className="mb-5 inline-flex items-center gap-1.5 bg-success/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-success uppercase">
                <Check className="size-3" strokeWidth={3} />
                Registered
              </div>
              <p className="mono-label mb-1 text-[10px] tracking-wider text-muted-foreground uppercase">
                OPD token
              </p>
              <p className="mb-5 font-mono text-5xl font-bold tracking-tighter text-foreground sm:text-6xl">
                {issued.token}
              </p>
              <dl className="space-y-3 border-t border-border/60 pt-4">
                <div>
                  <dt className="mono-label text-[10px] text-muted-foreground uppercase">
                    Patient
                  </dt>
                  <dd className="mt-0.5 font-semibold">{patientName}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="mono-label text-[10px] text-muted-foreground uppercase">
                      MRN
                    </dt>
                    <dd className="mt-0.5 font-mono text-sm">
                      {issued.patient._id.slice(-8).toUpperCase()}
                    </dd>
                  </div>
                  <div>
                    <dt className="mono-label text-[10px] text-muted-foreground uppercase">
                      Department
                    </dt>
                    <dd className="mt-0.5 font-mono text-sm">
                      {issued.appointment.department}
                    </dd>
                  </div>
                  <div>
                    <dt className="mono-label text-[10px] text-muted-foreground uppercase">
                      Doctor · appointment
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      {issued.appointment.doctor?.name || "Assigned doctor"} ·{" "}
                      {formatTime12Hour(issued.appointment.timeSlot)}
                    </dd>
                  </div>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-5 inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted print:hidden"
              >
                <Printer className="size-3.5" />
                Print slip
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center border border-dashed border-border/60 bg-background/50 px-6 py-10 text-center">
              <UserPlus className="mb-3 size-8 text-muted-foreground/30" />
              <p className="font-medium text-foreground">No slip yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Submit the form. The token appears here for the patient to take
                to OPD.
              </p>
            </div>
          )}

          <ul className="mt-6 space-y-2 text-sm text-muted-foreground print:hidden">
            <li>Verify photo ID before completing registration.</li>
            <li>Confirm the mobile number to link past records.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
