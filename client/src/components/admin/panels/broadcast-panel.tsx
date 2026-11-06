"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Clock, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { AdminHeader } from "../admin-header";

type BroadcastItem = {
  _id: string;
  title: string;
  message: string;
  targetGroup?: string;
  createdAt: string;
  readBy?: unknown[];
};

const fieldClass =
  "w-full hairline bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary/40";

export function BroadcastPanel() {
  const { token } = useAuthStore();
  const [targetGroup, setTargetGroup] = useState("EVERYONE");
  const [targetEmail, setTargetEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<BroadcastItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/notifications/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setHistory(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message)
      return toast.error("Title and message are required.");
    if (targetGroup === "SPECIFIC" && !targetEmail)
      return toast.error("Target email is required.");

    setIsSending(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/notifications/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, message, targetGroup, targetEmail }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Broadcast sent.");
        setTitle("");
        setMessage("");
        setTargetEmail("");
        fetchHistory();
      } else {
        throw new Error(json.message || "Failed to send broadcast");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section>
      <AdminHeader
        title="Broadcast"
        note="Send a notice to a role, or to everyone on this facility."
      />

      <div className="grid lg:grid-cols-2">
        <form
          onSubmit={handleSend}
          className="hairline-b hairline-l flex flex-col gap-4 px-5 py-6 sm:px-8"
        >
          <p className="mono-label text-muted-foreground flex items-center gap-2">
            <Send className="size-3.5" /> Compose
          </p>
          <label className="block">
            <span className="mono-label text-muted-foreground mb-1.5 block">
              Recipients
            </span>
            <select
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              className={fieldClass}
            >
              <option value="EVERYONE">Everyone</option>
              <option value="PATIENTS">Patients</option>
              <option value="DOCTORS">Doctors and nurses</option>
              <option value="SPECIFIC">Specific email</option>
            </select>
          </label>

          {targetGroup === "SPECIFIC" ? (
            <label className="block">
              <span className="mono-label text-muted-foreground mb-1.5 block">
                Email
              </span>
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="name@facility.org"
                className={fieldClass}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mono-label text-muted-foreground mb-1.5 block">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ward 3 water outage"
              className={fieldClass}
            />
          </label>

          <label className="block flex-1">
            <span className="mono-label text-muted-foreground mb-1.5 block">
              Message
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should they know, and by when."
              className={`${fieldClass} min-h-32 resize-y`}
            />
          </label>

          <button
            type="submit"
            disabled={isSending}
            className="mono-label inline-flex items-center justify-center gap-2 bg-foreground px-3 py-2 text-background transition-colors hover:bg-foreground/90 disabled:opacity-70"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send notice
          </button>
        </form>

        <div className="hairline-b px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground flex items-center gap-2">
            <Clock className="size-3.5" /> Sent
          </p>
          {isLoadingHistory ? (
            <p className="mt-8 text-center mono-label text-muted-foreground">
              Loading history…
            </p>
          ) : history.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">
              No broadcasts yet.
            </p>
          ) : (
            <ol className="mt-4">
              {history.map((n) => (
                <li key={n._id} className="hairline-b py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="mono-label shrink-0 text-muted-foreground">
                      {n.targetGroup || "EVERYONE"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>
                  <p className="mono-label mt-2 text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                    {typeof n.readBy?.length === "number"
                      ? ` · ${n.readBy.length} read`
                      : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
