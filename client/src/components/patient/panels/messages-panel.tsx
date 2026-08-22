"use client";

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

function stateTone(s: AppointmentRecord["status"]) {
  if (s === "CONFIRMED" || s === "COMPLETED") return "ok";
  if (s === "PENDING") return "warn";
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

function AppointmentRow({ a, actions }: { a: AppointmentRecord; actions?: React.ReactNode }) {
  return (
    <div className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
      <div className="w-28 shrink-0">
        <p className="mono-label text-brass">{new Date(a.date).toLocaleDateString()}</p>
        <p className="mono-label text-muted-foreground">{a.timeSlot}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{a.reason}</p>
        <p className="mono-label text-muted-foreground mt-1">
          {a.department} · {a.doctor?.name}
        </p>
      </div>
      <span className="mono-label text-muted-foreground hidden items-center gap-1.5 sm:flex">
        {a.type === "TELECONSULT" ? <Video className="size-3" /> : <MapPin className="size-3" />}
        {a.department}
      </span>
      <Pill tone={stateTone(a.status)}>{a.status}</Pill>
      {actions}
    </div>
  );
}

/* ---------- 07 messages ---------- */

export function MessagesPanel() {
  const { user } = useAuthStore();
  const [draft, setDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    const handleReceive = (data: any) => {
      setChatMessages((prev) => [...prev, data]);
    };
    
    socket.on("chat:receive_message", handleReceive);
    return () => {
      socket.off("chat:receive_message", handleReceive);
    };
  }, []);

  const handleSend = () => {
    const socket = getSocket();
    if (!draft.trim() || !socket || !user) return;
    const msg = {
      senderId: user.id || "patient-id",
      senderName: user.name || "Patient",
      role: "PATIENT",
      text: draft.trim(),
      timestamp: new Date().toISOString()
    };
    socket.emit("chat:send_message", msg);
    setChatMessages((prev) => [...prev, msg]);
    setDraft("");
  };

  return (
    <section>
      <PanelHeader
        index="07 / messages"
        title="Live Messages"
        note="Real-time chat with the care team."
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        <div className="bg-background lg:col-span-2">
          <div className="flex flex-col gap-px h-150 overflow-y-auto" style={{ background: "var(--hairline)" }}>
            {chatMessages.map((m, i) => (
              <div key={i} className="bg-background p-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className={m.role === "PATIENT" ? "bg-foreground/6 mono-label grid size-8 place-items-center" : "bg-accent/12 text-brass mono-label grid size-8 place-items-center"}>
                    {m.role === "PATIENT" ? "ME" : m.senderName[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{m.role === "PATIENT" ? "You" : m.senderName}</p>
                    <p className="mono-label text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{m.text}</p>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="p-8 text-center mono-label text-xs text-muted-foreground">
                No messages yet. Send a message to start chat.
              </div>
            )}
          </div>
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">New message</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder="Type your message..."
            className="hairline placeholder:text-muted-foreground mt-3 w-full resize-none bg-transparent p-3 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={handleSend}
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
        </div>
      </div>
    </section>
  );
}
