"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { PatientHeader } from "@/components/patient/patient-header";
import { useAuthStore } from "@/store/use-auth-store";
import { getSocket } from "@/lib/socket";

type ChatMessage = {
  senderId: string;
  senderName: string;
  role: string;
  text: string;
  timestamp: string;
};

export function MessagesPanel() {
  const { user } = useAuthStore();
  const [draft, setDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = (data: ChatMessage) => {
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
    const msg: ChatMessage = {
      senderId: user.id || "patient-id",
      senderName: user.name || "Patient",
      role: "PATIENT",
      text: draft.trim(),
      timestamp: new Date().toISOString(),
    };
    socket.emit("chat:send_message", msg);
    setChatMessages((prev) => [...prev, msg]);
    setDraft("");
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <PatientHeader title="Messages" note="Chat with your care team." />

      <div className="grid min-h-0 flex-1 gap-px bg-border/60 lg:grid-cols-3">
        <div className="flex min-h-80 flex-col bg-background lg:col-span-2">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="flex h-full min-h-60 items-center justify-center px-6 text-center">
                <p className="max-w-xs text-sm text-muted-foreground">
                  No messages yet. Write on the right and it goes to your care
                  team.
                </p>
              </div>
            ) : (
              chatMessages.map((m, i) => (
                <div
                  key={`${m.timestamp}-${i}`}
                  className="border-b border-border/40 px-5 py-4 sm:px-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center bg-muted font-mono text-[10px] font-bold">
                      {m.role === "PATIENT"
                        ? "ME"
                        : m.senderName[0]?.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {m.role === "PATIENT" ? "You" : m.senderName}
                      </p>
                      <p className="mono-label text-muted-foreground">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {m.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-background p-5">
          <label
            htmlFor="patient-new-message"
            className="mono-label block text-muted-foreground"
          >
            New message
          </label>
          <textarea
            id="patient-new-message"
            aria-label="Type your message"
            title="Type your message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder="Type your message…"
            className="hairline mt-3 w-full resize-none bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
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
                : "hairline cursor-not-allowed text-muted-foreground"
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
