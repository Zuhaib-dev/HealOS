import { useState } from "react";
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
  return (
    <section>
      <PanelHeader
        index="01 / my health"
        title={`Hello, ${patient.name.split(" ")[0]}`}
        note="Your next visit, the trends your clinicians are watching, and anything waiting on you."
        actions={
          <>
            <ActionButton>Download health summary</ActionButton>
            <ActionButton tone="solid">Book appointment</ActionButton>
          </>
        }
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5 lg:col-span-2">
          <p className="mono-label text-muted-foreground">Next appointment</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight">
            {upcoming[0]!.reason}
          </p>
          <p className="mono-label text-muted-foreground mt-2">
            {upcoming[0]!.date} · {upcoming[0]!.time} · {upcoming[0]!.room} ·{" "}
            {upcoming[0]!.dept}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton tone="solid">Add to calendar</ActionButton>
            <ActionButton>Reschedule</ActionButton>
            <ActionButton>Prep instructions</ActionButton>
          </div>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Waiting on you</p>
          <ul className="mt-3 space-y-3">
            {[
              { t: "1 invoice due — ₹650", tone: "bad" as const },
              { t: "2 unread messages from your team", tone: "warn" as const },
              { t: "Repeat needed: Sumatriptan", tone: "warn" as const },
              { t: "Fast 6h before 04 Aug scan", tone: "mute" as const },
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
            {patient.allergies.map((a) => (
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
  const [clinician, setClinician] = useState(departments[0]!.clinicians[0]!);
  const [date, setDate] = useState("2026-08-06");
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<"In person" | "Video">("In person");
  const [reason, setReason] = useState("");
  const [booked, setBooked] = useState(false);

  return (
    <section>
      <PanelHeader
        index="02 / new visit"
        title="Book an appointment"
        note="Pick a department, clinician and free slot. You will get a confirmation message and any preparation instructions."
      />

      {booked ? (
        <div className="p-5 sm:p-8">
          <div className="hairline max-w-xl p-6">
            <Check className="text-brass size-6" />
            <p className="mt-3 font-mono text-xl">Appointment requested</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {dept.label} with {clinician} on {date} at {time} · {mode}. You will get a
              confirmation within an hour; it will appear under Appointments as pending until the
              department confirms.
            </p>
            <div className="mt-5 flex gap-2">
              <ActionButton
                tone="solid"
                onClick={() => {
                  setBooked(false);
                  setTime(null);
                  setReason("");
                }}
              >
                Book another
              </ActionButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
          <div className="bg-background p-5">
            <p className="mono-label text-muted-foreground">Department</p>
            <div className="mt-2 flex flex-col gap-0.5">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDept(d);
                    setClinician(d.clinicians[0]!);
                  }}
                  className={`mono-label px-3 py-2 text-left transition-colors ${
                    dept.id === d.id
                      ? "bg-accent/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <p className="mono-label text-muted-foreground mt-5">Clinician</p>
            <select
              value={clinician}
              onChange={(e) => setClinician(e.target.value)}
              className="hairline mono-label mt-2 w-full bg-transparent px-3 py-2.5 outline-none"
            >
              {dept.clinicians.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <p className="mono-label text-muted-foreground mt-5">Visit type</p>
            <div className="mt-2 flex gap-2">
              {(["In person", "Video"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`mono-label flex-1 px-3 py-2.5 ${
                    mode === m ? "bg-foreground text-background" : "hairline text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background p-5 lg:col-span-2">
            <p className="mono-label text-muted-foreground">Date</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="hairline mono-label mt-2 bg-transparent px-3 py-2.5 outline-none"
            />

            <p className="mono-label text-muted-foreground mt-5">Available slots</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {slotTimes.map((t) => {
                const taken = bookedTimes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={taken}
                    onClick={() => setTime(t)}
                    className={`mono-label px-4 py-2.5 transition-colors ${
                      taken
                        ? "text-muted-foreground/50 hairline cursor-not-allowed line-through"
                        : time === t
                          ? "bg-accent/15 text-brass"
                          : "hairline hover:bg-foreground/[0.03]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <p className="mono-label text-muted-foreground mt-5">Reason for visit</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="Briefly describe your symptoms or what you want reviewed"
              className="hairline placeholder:text-muted-foreground mt-2 w-full resize-none bg-transparent p-3 text-sm outline-none"
            />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!time}
                onClick={() => setBooked(true)}
                className={`mono-label px-4 py-2.5 transition-opacity ${
                  time
                    ? "bg-foreground text-background hover:opacity-85"
                    : "hairline text-muted-foreground cursor-not-allowed"
                }`}
              >
                Request appointment
              </button>
              <span className="mono-label text-muted-foreground">
                {time
                  ? `${dept.label} · ${clinician} · ${date} ${time} · ${mode}`
                  : "select a slot to continue"}
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
  const rows = tab === "upcoming" ? upcoming : history;

  return (
    <section>
      <PanelHeader
        index="03 / visits"
        title="Appointments"
        note="Everything scheduled and everything that has happened — with the reason recorded at each visit."
        actions={
          <>
            <ActionButton tone={tab === "upcoming" ? "solid" : "ghost"} onClick={() => setTab("upcoming")}>
              Upcoming ({upcoming.length})
            </ActionButton>
            <ActionButton tone={tab === "past" ? "solid" : "ghost"} onClick={() => setTab("past")}>
              Past ({history.length})
            </ActionButton>
          </>
        }
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {rows.map((a) => (
          <AppointmentRow
            key={a.id}
            a={a}
            actions={
              tab === "upcoming" ? (
                <div className="flex gap-2">
                  <ActionButton>Reschedule</ActionButton>
                  <ActionButton>
                    <span className="inline-flex items-center gap-1.5">
                      <X className="size-3" />
                      Cancel
                    </span>
                  </ActionButton>
                </div>
              ) : (
                <div className="flex gap-2">
                  <ActionButton>Visit summary</ActionButton>
                  <ActionButton>Book follow-up</ActionButton>
                </div>
              )
            }
          />
        ))}
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
  return (
    <section>
      <PanelHeader
        index="08 / profile"
        title="My profile"
        note="Contact details, insurance, consent and access — keep these current so results and reminders reach you."
        actions={<ActionButton tone="solid">Save changes</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Personal</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {[
              { l: "Full name", v: patient.name },
              { l: "MRN", v: patient.mrn },
              { l: "Age / sex", v: `${patient.age} / ${patient.sex}` },
              { l: "Blood group", v: patient.blood },
              { l: "Mobile", v: patient.phone },
              { l: "Email", v: patient.email },
            ].map((f) => (
              <label key={f.l} className="block">
                <span className="mono-label text-muted-foreground">{f.l}</span>
                <input
                  defaultValue={f.v}
                  className="hairline mt-2 w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Insurance</p>
          <p className="mt-2 text-sm">{patient.insurer}</p>
          <p className="mono-label text-muted-foreground mt-1">primary: {patient.primary}</p>

          <p className="mono-label text-muted-foreground mt-6">Consent &amp; sharing</p>
          <ul className="mt-3 space-y-3">
            {[
              { t: "Share records with my referring GP", on: true },
              { t: "SMS reminders before appointments", on: true },
              { t: "Email results when ready", on: true },
              { t: "Use my de-identified data for research", on: false },
            ].map((c) => (
              <li key={c.t} className="flex items-center justify-between gap-4">
                <span className="text-sm">{c.t}</span>
                <span
                  className={`mono-label px-2 py-1 ${
                    c.on ? "bg-accent/12 text-brass" : "bg-foreground/[0.04] text-muted-foreground"
                  }`}
                >
                  {c.on ? "on" : "off"}
                </span>
              </li>
            ))}
          </ul>

          <p className="mono-label text-muted-foreground mt-6">Emergency contact</p>
          <p className="mt-2 text-sm">A. Joshi · brother · +91 90•••• 7781</p>
        </div>
      </div>
    </section>
  );
}
