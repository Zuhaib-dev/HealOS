import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { z } from "zod";

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
  email: z.string().trim().email("Enter a valid work email").max(160, "Email is too long"),
  organisation: z.string().trim().min(2, "Enter your hospital or organisation").max(120, "Too long"),
  role: z.string().trim().min(1, "Select your role"),
  beds: z.string().trim().min(1, "Select facility size"),
  topic: z.string().trim().min(1, "Select a subject"),
  urgency: z.string().trim().min(1, "Select urgency"),
  message: z
    .string()
    .trim()
    .min(20, "Give us at least 20 characters of context")
    .max(1200, "Keep it under 1200 characters"),
});

type Field = keyof z.infer<typeof enquirySchema>;

const roles = ["Clinician", "Hospital administrator", "CIO / IT lead", "Procurement", "Other"];
const bedBands = ["< 100 beds", "100–299 beds", "300–699 beds", "700+ beds", "Multi-site network"];
const topics = [
  "Product walkthrough",
  "Implementation & migration",
  "Security / compliance review",
  "Pricing & procurement",
  "Existing deployment support",
  "Partnership or press",
];
const urgencies = ["Planning (this quarter)", "Evaluating now", "Live incident"];

const initial: Record<Field, string> = {
  name: "",
  email: "",
  organisation: "",
  role: "",
  beds: "",
  topic: "",
  urgency: "",
  message: "",
};

export function ContactForm() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const set = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = enquirySchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setState("sending");
    window.setTimeout(() => setState("sent"), 900);
  };

  const isSubmitting = state === "sending";
  const isPending = isSubmitting;

  const ref = `HL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return (
    <div className="hairline-t hairline-b relative">
      <AnimatePresence mode="wait">
        {state === "sent" ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-1 py-16"
          >
            <p className="mono-label text-brass">Ticket opened</p>
            <h3 className="font-display mt-5 text-3xl font-bold tracking-[-0.03em]">
              Received. Reference {ref}.
            </h3>
            <p className="text-muted-foreground mt-5 max-w-xl leading-relaxed">
              Routed to{" "}
              <span className="text-foreground">{values.topic.toLowerCase()}</span> with{" "}
              <span className="text-foreground">{values.urgency.toLowerCase()}</span> priority. A
              named specialist replies to {values.email} — clinical incidents inside 15 minutes,
              everything else inside one working day.
            </p>
            <button
              type="button"
              onClick={() => {
                setValues(initial);
                setState("idle");
              }}
              className="mono-label text-muted-foreground hover:text-foreground hairline-t mt-10 pt-5 transition-colors"
            >
              Send another enquiry →
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            noValidate
            className="grid grid-cols-1 gap-x-10 gap-y-8 py-12 sm:grid-cols-2"
          >
            <Text label="Full name" field="name" value={values.name} error={errors.name} onChange={set} placeholder="Dr. Anaya Rao" />
            <Text label="Work email" field="email" value={values.email} error={errors.email} onChange={set} placeholder="a.rao@hospital.org" type="email" />
            <Text label="Hospital / organisation" field="organisation" value={values.organisation} error={errors.organisation} onChange={set} placeholder="Northside General" />
            <Select label="Your role" field="role" value={values.role} error={errors.role} onChange={set} options={roles} />
            <Select label="Facility size" field="beds" value={values.beds} error={errors.beds} onChange={set} options={bedBands} />
            <Select label="Subject" field="topic" value={values.topic} error={errors.topic} onChange={set} options={topics} />

            <div className="sm:col-span-2">
              <p className="mono-label text-brass">Urgency</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {urgencies.map((u) => {
                  const active = values.urgency === u;
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => set("urgency", u)}
                      className={`mono-label px-4 py-3 transition-colors ${
                        active
                          ? "bg-foreground text-background"
                          : "hairline-t hairline-b text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {u}
                    </button>
                  );
                })}
              </div>
              {errors.urgency && <p className="mono-label text-destructive mt-3">{errors.urgency}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="message" className="mono-label text-brass">
                What do you need?
              </label>
              <textarea
                id="message"
                rows={5}
                maxLength={1200}
                value={values.message}
                onChange={(e) => set("message", e.target.value)}
                placeholder="Current systems, timeline, integrations you must keep, anything blocking you."
                className="hairline-b placeholder:text-muted-foreground/50 mt-4 w-full resize-none bg-transparent pb-3 text-lg outline-none transition-colors focus:border-b-[var(--accent)]"
              />
              <div className="mono-label text-muted-foreground mt-3 flex justify-between">
                <span>{errors.message ?? "No patient identifiable information, please."}</span>
                <span>{values.message.length} / 1200</span>
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-foreground text-background mono-label group inline-flex items-center gap-3 px-7 py-4 transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                {isSubmitting ? "Routing…" : "Open a ticket"}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
              <p className="mono-label text-muted-foreground">
                Encrypted in transit · Retained 24 months · No marketing lists
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Text({
  label,
  field,
  value,
  error,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  field: Field;
  value: string;
  error?: string | undefined;
  onChange: (f: Field, v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={field} className="mono-label text-brass">
        {label}
      </label>
      <input
        id={field}
        type={type}
        value={value}
        maxLength={200}
        placeholder={placeholder}
        onChange={(e) => onChange(field, e.target.value)}
        className="hairline-b placeholder:text-muted-foreground/50 mt-4 w-full bg-transparent pb-3 text-lg outline-none transition-colors focus:border-b-[var(--accent)]"
      />
      {error && <p className="mono-label text-destructive mt-3">{error}</p>}
    </div>
  );
}

function Select({
  label,
  field,
  value,
  error,
  onChange,
  options,
}: {
  label: string;
  field: Field;
  value: string;
  error?: string | undefined;
  onChange: (f: Field, v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={field} className="mono-label text-brass">
        {label}
      </label>
      <select
        id={field}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className="hairline-b text-foreground mt-4 w-full appearance-none bg-transparent pb-3 text-lg outline-none transition-colors focus:border-b-[var(--accent)]"
      >
        <option value="" className="bg-background">
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-background">
            {o}
          </option>
        ))}
      </select>
      {error && <p className="mono-label text-destructive mt-3">{error}</p>}
    </div>
  );
}
