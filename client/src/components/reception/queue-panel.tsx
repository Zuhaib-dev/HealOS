"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { LiveDot, Pill } from "@/components/workspace/ui";
import { fetchQueueApi, AppointmentRecord } from "@/lib/api/reception";
import { updateAppointmentStatusApi } from "@/lib/api/appointment";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

export function QueuePanel() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);

  const loadQueue = () => {
    fetchQueueApi().then(res => {
      if (res.status === "success") {
        setAppointments(res.data.appointments);
      }
    }).catch(console.error);
  };

  useEffect(() => {
    loadQueue();
    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => {
        loadQueue();
      };
      socket.on("appointment_updated", handleUpdate);
      socket.on("appointment_created", handleUpdate);
      return () => {
        socket.off("appointment_updated", handleUpdate);
        socket.off("appointment_created", handleUpdate);
      };
    }
  }, []);

  const handleUpdateStatus = async (id: string, status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "IN_PROGRESS" | "NO_SHOW") => {
    try {
      // @ts-ignore
      const res = await updateAppointmentStatusApi(id, status);
      if (res.success) {
        toast.success(`Token marked as ${status}`);
        loadQueue();
      }
    } catch (err) {
      toast.error("Failed to update token status");
    }
  };

  // Group appointments by department/doctor
  const queuesMap: Record<string, {
    department: string;
    room: string;
    doctor: string;
    nowServing: string;
    nowServingId?: string;
    nextId?: string;
    waiting: number;
    avgMin: number;
    state: "in-room" | "break";
  }> = {};

  appointments.forEach(app => {
    const key = app.department;
    if (!queuesMap[key]) {
      queuesMap[key] = {
        department: app.department,
        room: `OPD · ${app.department}`,
        doctor: app.doctor ? `Dr. ${app.doctor.name || "TBA"}` : "TBA",
        nowServing: "-",
        waiting: 0,
        avgMin: 12,
        state: "in-room",
      };
    }
    // Reception uses CONFIRMED as scheduled
    if (app.status === "PENDING" || app.status === "CONFIRMED") {
      queuesMap[key].waiting++;
      if (!queuesMap[key].nextId) queuesMap[key].nextId = app._id;
    } else if (app.status === "IN_PROGRESS") {
      queuesMap[key].nowServing = `${app.department.charAt(0)}-${app._id.slice(-4)}`;
      queuesMap[key].nowServingId = app._id;
    }
  });

  const serving = Object.values(queuesMap);

  return (
    <section>
      <PanelHeader
        index="02 / queue"
        title="Token &amp; queue display"
        note="Counter-side mirror of the waiting-hall display. Calling the next token pushes to screens and the SMS gateway."
        actions={<ActionButton tone="solid">Open hall display</ActionButton>}
      />

      {serving.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No active queues today.
        </div>
      )}

      <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {serving.map((q, idx) => (
          <div key={q.room} className="bg-background p-5 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono-label text-accent/80">{q.room}</p>
                <p className="mono-label text-muted-foreground mt-1">{q.doctor}</p>
              </div>
              <span className="inline-flex items-center gap-2">
                {q.state === "in-room" && <LiveDot />}
                <Pill tone={q.state === "in-room" ? "ok" : "warn"}>{q.state}</Pill>
              </span>
            </div>

            <p className="mono-label text-muted-foreground mt-6">Now serving</p>
            <p className="text-brass font-mono text-6xl font-bold tracking-tight">{q.nowServing}</p>

            <div className="mono-label mt-5 grid grid-cols-3 gap-px" style={{ background: "var(--hairline)" }}>
              {[
                ["Waiting", `${q.waiting}`],
                ["Avg consult", `${q.avgMin}m`],
                ["Est. wait", `${q.waiting * q.avgMin}m`],
              ].map(([k, v]) => (
                <div key={k} className="bg-background px-2 py-3 text-center">
                  <p className="text-muted-foreground">{k}</p>
                  <p className="text-foreground mt-1 font-mono text-base">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <ActionButton 
                tone="solid" 
                onClick={() => {
                  if (q.nextId) {
                    handleUpdateStatus(q.nextId, "IN_PROGRESS");
                  } else {
                    toast.error("No patients waiting in queue");
                  }
                }}
              >
                <Ticket className="mr-1 inline size-3" />
                Call next
              </ActionButton>
              {q.nowServingId && (
                <ActionButton onClick={() => handleUpdateStatus(q.nowServingId!, "IN_PROGRESS")}>
                  Recall
                </ActionButton>
              )}
              {q.nowServingId && (
                <ActionButton onClick={() => handleUpdateStatus(q.nowServingId!, "CANCELLED")}>
                  Mark no-show
                </ActionButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
