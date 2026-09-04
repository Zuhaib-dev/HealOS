import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */
function CellShell({
  id,
  title,
  status,
  children,
  className = "",
  delay = 0,
}: {
  id: string;
  title: string;
  status?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay }}
      className={`group bg-background relative flex flex-col p-6 lg:p-7 ${className}`}
    >
      <div className="mono-label text-muted-foreground flex items-center justify-between">
        <span>
          <span className="text-brass">{id}</span> · {title}
        </span>
        {status}
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
      <span className="bg-accent absolute bottom-0 left-0 h-px w-0 transition-all duration-500 group-hover:w-full" />
    </motion.div>
  );
}

function Key({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <kbd
      className={`mono-label hairline inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-[0.6rem] transition-all duration-150 ${
        active ? "bg-accent/20 text-brass translate-y-px" : "text-muted-foreground"
      }`}
    >
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------ */
/* A · Live command palette — type, arrow, enter. Really works.        */
/* ------------------------------------------------------------------ */
const paletteActions = [
  { tag: "chart", label: "Open chart — Meera Krishnan · HOS-88214", hint: "G P" },
  { tag: "order", label: "Order CBC + electrolytes — Bed 7A", hint: "O L" },
  { tag: "theatre", label: "Book OT-2 · ortho · 14:30 slot", hint: "G T" },
  { tag: "meds", label: "eMAR due — Ward C · 6 administrations", hint: "G M" },
  { tag: "page", label: "Page on-call anaesthesia", hint: "P A" },
  { tag: "audit", label: "Export audit evidence pack", hint: "E X" },
];

function CommandPaletteCell() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = paletteActions.filter((a) =>
    a.label.toLowerCase().includes(query.trim().toLowerCase())
  );
  const clamped = Math.min(index, Math.max(filtered.length - 1, 0));

  // ⌘K focuses the palette from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (label: string) => {
    setFlash(label);
    window.setTimeout(() => setFlash(null), 1800);
  };

  return (
    <CellShell
      id="A"
      title="Command"
      className="xl:col-span-7 xl:row-span-2"
      status={
        <span className="flex items-center gap-1.5">
          <Key>⌘</Key>
          <Key>K</Key>
        </span>
      }
    >
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        Every action in HealOS is one keystroke away. Try it — this palette is live. Type to
        filter, arrows to move, enter to run.
      </p>

      <div className="plate mt-5 flex flex-1 flex-col">
        <div className="hairline-b flex items-center gap-3 px-4 py-3">
          <svg viewBox="0 0 16 16" className="text-brass size-3.5" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.25" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[clamped]) {
                run(filtered[clamped].label);
              } else if (e.key === "Escape") {
                setQuery("");
              }
            }}
            placeholder="Type a command or search the record…"
            aria-label="Type a command or search the record"
            className="text-foreground placeholder:text-muted-foreground/60 w-full bg-transparent font-mono text-sm outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
          />
          <span className="mono-label text-muted-foreground hidden sm:inline">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <ul className="relative flex-1">
          {filtered.length === 0 && (
            <li className="mono-label text-muted-foreground px-4 py-5">
              No match — the record never lies, but it does refuse.
            </li>
          )}
          {filtered.map((a, i) => (
            <li key={a.tag}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(a.label)}
                className={`flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors ${
                  i === clamped ? "bg-accent/10" : ""
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`size-1 ${i === clamped ? "bg-accent" : "bg-foreground/20"}`}
                  />
                  <span
                    className={`text-sm ${i === clamped ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {a.label}
                  </span>
                </span>
                <span className="mono-label text-muted-foreground hidden sm:inline">{a.hint}</span>
              </button>
            </li>
          ))}

          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-background/95 hairline-t absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 py-2.5 backdrop-blur-sm"
              >
                <span className="bg-accent size-1.5 animate-pulse rounded-full" />
                <span className="mono-label text-brass">executed</span>
                <span className="text-muted-foreground truncate font-mono text-xs">{flash}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </ul>

        <div className="hairline-t flex items-center gap-4 px-4 py-2.5">
          <span className="flex items-center gap-1.5">
            <Key>↑</Key>
            <Key>↓</Key>
            <span className="mono-label text-muted-foreground ml-1">navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Key>↵</Key>
            <span className="mono-label text-muted-foreground ml-1">execute</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Key>esc</Key>
            <span className="mono-label text-muted-foreground ml-1">clear</span>
          </span>
        </div>
      </div>
    </CellShell>
  );
}

/* ------------------------------------------------------------------ */
/* B · Live audit stream — appends forever, pauses on hover            */
/* ------------------------------------------------------------------ */
const auditPool = [
  "dr.rao opened chart HOS-88214",
  "rx #4471 dispensed · ward c",
  "ot-2 slot locked · ortho",
  "lab k+ 6.1 flagged critical",
  "bed 7a transfer → hdu",
  "claim #9918 pre-flighted",
  "night rota published",
  "break-glass · er bay 2",
  "consent signed · hos-90117",
  "dose checked · interaction clear",
];

function stamp(offsetSec: number) {
  const d = new Date(Date.now() - offsetSec * 1000);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function AuditStreamCell() {
  const reduce = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(false);
  const [lines, setLines] = useState(() =>
    auditPool.slice(0, 4).map((text, i) => ({ id: i, t: stamp((4 - i) * 2), text }))
  );
  const next = useRef(4);

  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setInterval(() => {
      setLines((ls) => {
        const entry = {
          id: next.current,
          t: stamp(0),
          text: auditPool[next.current % auditPool.length]!,
        };
        next.current += 1;
        return [...ls.slice(-4), entry];
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, [paused, reduce]);

  return (
    <CellShell
      id="B"
      title="Audit stream"
      className="xl:col-span-5"
      delay={0.08}
      status={
        <span className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${paused ? "bg-muted-foreground" : "bg-accent animate-pulse"}`}
          />
          <span className={paused ? "" : "text-brass"}>{paused ? "paused" : "live"}</span>
        </span>
      }
    >
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex flex-1 flex-col justify-end gap-1 overflow-hidden py-1"
      >
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-baseline gap-3 font-mono text-xs"
            >
              <span className="text-brass tabular-nums">{l.t}</span>
              <span className="text-muted-foreground truncate">{l.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex items-center gap-2 pt-1 font-mono text-xs">
          <span className="text-muted-foreground">$</span>
          <span className="bg-accent inline-block h-3.5 w-1.5 animate-pulse" />
        </div>
      </div>
      <p className="mono-label text-muted-foreground mt-4">
        Every read is a write. Hover to freeze the tape.
      </p>
    </CellShell>
  );
}

/* ------------------------------------------------------------------ */
/* C · Break-glass — press and hold to authorize                       */
/* ------------------------------------------------------------------ */
function BreakGlassCell() {
  const HOLD_MS = 900;
  const [progress, setProgress] = useState(0);
  const [granted, setGranted] = useState(false);
  const raf = useRef(0);

  const cancel = () => {
    cancelAnimationFrame(raf.current);
    if (!granted) setProgress(0);
  };

  const start = () => {
    if (granted) return;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / HOLD_MS, 1);
      setProgress(p);
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setGranted(true);
        window.setTimeout(() => {
          setGranted(false);
          setProgress(0);
        }, 3200);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const r = 15;
  const c = 2 * Math.PI * r;

  return (
    <CellShell
      id="C"
      title="Break-glass"
      className="xl:col-span-5"
      delay={0.12}
      status={<span className="text-muted-foreground">hold 0.9s</span>}
    >
      <p className="text-muted-foreground text-sm leading-relaxed">
        Emergency access is possible — never silent. Hold the seal to feel how a deliberate action
        resists accidental taps.
      </p>

      <div className="mt-5 flex items-center gap-5">
        <button
          type="button"
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          className="relative grid size-16 shrink-0 cursor-pointer place-items-center select-none"
          aria-label="Hold to authorize break-glass access"
        >
          <svg viewBox="0 0 40 40" className="absolute inset-0 size-16 -rotate-90">
            <circle
              cx="20"
              cy="20"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-foreground"
              opacity={0.18}
            />
            <circle
              cx="20"
              cy="20"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="butt"
              className={granted ? "text-accent" : "text-brass"}
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
            />
          </svg>
          <span className={`mono-label text-[0.55rem] ${granted ? "text-brass" : "text-muted-foreground"}`}>
            {granted ? "open" : "hold"}
          </span>
        </button>

        <div className="min-h-10 flex-1">
          {granted ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-brass font-mono text-sm">GRANTED · OTP 4417-08</p>
              <p className="mono-label text-muted-foreground mt-1">
                logged as event #8841 · supervisor paged
              </p>
            </motion.div>
          ) : (
            <div>
              <div className="hairline relative h-1 w-full overflow-hidden">
                <div
                  className="bg-accent absolute inset-y-0 left-0 transition-[width] duration-75"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mono-label text-muted-foreground mt-2">
                {progress > 0 ? "authorizing…" : "sealed · field-level audit armed"}
              </p>
            </div>
          )}
        </div>
      </div>
    </CellShell>
  );
}

/* ------------------------------------------------------------------ */
/* D · Offline sync — kill the uplink, watch the queue, restore        */
/* ------------------------------------------------------------------ */
function OfflineCell() {
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    if (!online) {
      const id = window.setInterval(() => setQueued((q) => Math.min(q + 1, 24)), 700);
      return () => window.clearInterval(id);
    }
    if (queued > 0) {
      const id = window.setInterval(() => setQueued((q) => Math.max(q - 1, 0)), 90);
      return () => window.clearInterval(id);
    }
    return undefined;
  }, [online, queued > 0]);

  const syncing = online && queued > 0;

  return (
    <CellShell
      id="D"
      title="Offline first"
      className="xl:col-span-4"
      delay={0.05}
      status={
        <span className={online ? "text-brass" : "text-destructive"}>
          {online ? (syncing ? "syncing" : "uplink ok") : "offline"}
        </span>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Wards don't stop when the network does. Flip the uplink.
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={online}
          onClick={() => setOnline((v) => !v)}
          className={`hairline relative h-6 w-11 shrink-0 transition-colors ${
            online ? "bg-accent/25" : "bg-destructive/15"
          }`}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={`absolute top-0.75 size-4 ${
              online ? "bg-accent right-0.75" : "bg-destructive left-0.75"
            }`}
          />
        </button>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <span className="font-display text-4xl font-bold tracking-tight tabular-nums">
          {queued}
        </span>
        <span className="mono-label text-muted-foreground">
          {syncing ? "draining queue" : online ? "changes queued" : "buffering locally"}
        </span>
      </div>

      <div className="mt-3 flex h-6 items-end gap-0.75">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={i}
            className={`flex-1 ${i < queued ? (online ? "bg-brass" : "bg-destructive/80") : "bg-foreground/10"}`}
            animate={{ height: i < queued ? "100%" : "30%" }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
      <p className="mono-label text-muted-foreground mt-4">
        {syncing ? "merging — conflict-free, in order" : "encrypted at rest · syncs in order"}
      </p>
    </CellShell>
  );
}

/* ------------------------------------------------------------------ */
/* E · Site clocks — three facilities, real time                       */
/* ------------------------------------------------------------------ */
const sites = [
  { id: "CHN-01", city: "Chennai", tz: "Asia/Kolkata" },
  { id: "DXB-02", city: "Dubai", tz: "Asia/Dubai" },
  { id: "LHR-03", city: "London", tz: "Europe/London" },
];

function tzParts(tz: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: get("hour") % 24, m: get("minute"), s: get("second") };
}

function SiteClocksCell() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <CellShell
      id="E"
      title="Site clocks"
      className="xl:col-span-4"
      delay={0.1}
      status={<span className="text-brass">3 facilities</span>}
    >
      <div className="flex flex-1 flex-col justify-between gap-4">
        {sites.map((s) => {
          const { h, m, s: sec } = tzParts(s.tz, now);
          return (
            <div key={s.id} className="group/row flex items-center gap-4">
              <svg viewBox="0 0 32 32" className="size-8 shrink-0">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-foreground"
                  opacity={0.2}
                />
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={i}
                    x1="16"
                    y1="3"
                    x2="16"
                    y2={i % 3 === 0 ? "6" : "4.5"}
                    stroke="currentColor"
                    strokeWidth="0.75"
                    className="text-brass"
                    opacity={i % 3 === 0 ? 0.8 : 0.3}
                    transform={`rotate(${i * 30} 16 16)`}
                  />
                ))}
                <line
                  x1="16"
                  y1="16"
                  x2="16"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-foreground"
                  transform={`rotate(${(h % 12) * 30 + m * 0.5} 16 16)`}
                />
                <line
                  x1="16"
                  y1="16"
                  x2="16"
                  y2="6.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-foreground"
                  opacity={0.7}
                  transform={`rotate(${m * 6} 16 16)`}
                />
                <line
                  x1="16"
                  y1="18"
                  x2="16"
                  y2="5.5"
                  stroke="currentColor"
                  strokeWidth="0.75"
                  className="text-accent"
                  transform={`rotate(${sec * 6} 16 16)`}
                />
                <circle cx="16" cy="16" r="1.25" className="fill-accent" />
              </svg>
              <div className="flex flex-1 items-baseline justify-between">
                <div>
                  <p className="text-sm font-medium">{s.city}</p>
                  <p className="mono-label text-muted-foreground">{s.id}</p>
                </div>
                <p className="text-foreground font-mono text-sm tabular-nums">
                  {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
                  <span className="text-brass">:{String(sec).padStart(2, "0")}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mono-label text-muted-foreground mt-4">
        One fabric, three time zones, zero drift
      </p>
    </CellShell>
  );
}

/* ------------------------------------------------------------------ */
/* F · Fabric latency — live jitter per site, hover pins a row         */
/* ------------------------------------------------------------------ */
const links = [
  { id: "CHN-01", base: 14 },
  { id: "DXB-02", base: 31 },
  { id: "LHR-03", base: 44 },
  { id: "SIN-04", base: 22 },
];

function LatencyCell() {
  const reduce = useReducedMotion() ?? false;
  const [pings, setPings] = useState(links.map((l) => l.base));
  const [pinned, setPinned] = useState<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setPings((ps) =>
        ps.map((p, i) => {
          const target = links[i]!.base + (Math.random() - 0.5) * 10;
          return Math.round(p + (target - p) * 0.4);
        })
      );
    }, 900);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <CellShell
      id="F"
      title="Fabric latency"
      className="xl:col-span-4"
      delay={0.15}
      status={<span className="text-brass">p95 {Math.max(...pings)}ms</span>}
    >
      <div className="flex flex-1 flex-col justify-center gap-3.5">
        {links.map((l, i) => (
          <div
            key={l.id}
            onMouseEnter={() => setPinned(i)}
            onMouseLeave={() => setPinned(null)}
            className="group/row cursor-crosshair"
          >
            <div className="mb-1.5 flex items-baseline justify-between">
              <span
                className={`mono-label transition-colors ${
                  pinned === i ? "text-brass" : "text-muted-foreground"
                }`}
              >
                {l.id}
              </span>
              <span
                className={`font-mono text-xs tabular-nums transition-colors ${
                  pinned === i ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {pings[i]}ms
              </span>
            </div>
            <div className="hairline relative h-0.75 w-full">
              <motion.div
                className={`absolute inset-y-0 left-0 ${
                  pinned === i ? "bg-brass" : "bg-accent/70"
                }`}
                animate={{ width: `${Math.min(((pings[i] ?? 0) / 70) * 100, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mono-label text-muted-foreground mt-4">
        edge-replicated · reads served under 60ms
      </p>
    </CellShell>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
export function InstrumentBento() {
  return (
    <section id="instrument" className="relative">
      <div className="mx-auto max-w-350 px-5 sm:px-8">
        <div className="hairline-t grid grid-cols-1 gap-8 py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-4">
            <p className="mono-label text-brass">005 / Inside the instrument</p>
            <h2 className="font-display mt-6 text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.02] font-bold tracking-[-0.03em]">
              Built to be felt,
              <br />
              not noticed.
            </h2>
          </div>
          <p className="text-muted-foreground lg:col-span-5 lg:col-start-8 lg:self-end">
            The details below are not screenshots. Every cell on this panel is alive — press,
            hold, type and toggle them. The product behaves the same way at 3 a.m. on a night
            shift.
          </p>
        </div>

        <div
          className="grid grid-cols-1 gap-px md:grid-cols-2 xl:grid-cols-12"
          style={{ background: "var(--hairline)" }}
        >
          <CommandPaletteCell />
          <AuditStreamCell />
          <BreakGlassCell />
          <OfflineCell />
          <SiteClocksCell />
          <LatencyCell />
        </div>

        <div className="hairline-t mono-label text-muted-foreground flex flex-wrap items-center justify-between gap-4 py-4">
          <span>
            panel <span className="text-brass">005-A…F</span> · all interactions live
          </span>
          <span className="flex items-center gap-1.5">
            press <Key>⌘</Key>
            <Key>K</Key> anywhere to jump to the palette
          </span>
        </div>
      </div>
    </section>
  );
}
