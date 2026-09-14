"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Send, Clock, Users, Activity, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { PanelHeader, ActionButton } from "../admin-shell";

export function BroadcastPanel() {
  const { token } = useAuthStore();
  const [targetGroup, setTargetGroup] = useState("EVERYONE");
  const [targetEmail, setTargetEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
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
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.error("Title and message are required.");
    if (targetGroup === "SPECIFIC" && !targetEmail) return toast.error("Target email is required.");

    setIsSending(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
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
        toast.success("Broadcast sent successfully!");
        setTitle("");
        setMessage("");
        setTargetEmail("");
        fetchHistory();
      } else {
        throw new Error(json.message || "Failed to send broadcast");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="pb-12 h-full flex flex-col">
      <PanelHeader
        index="ADM / 07"
        title="Broadcast"
        note="Push real-time notifications to users and partners."
      />
      
      <div className="grid lg:grid-cols-2 gap-8 px-5 py-6 sm:px-8 flex-1">
        
        {/* Compose Form */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm flex flex-col"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-primary"><Send className="size-5" /></span>
            <h2 className="font-display font-semibold text-lg tracking-tight">Compose Message</h2>
          </div>
          
          <form onSubmit={handleSend} className="space-y-5 flex-1 flex flex-col">
            <div>
              <label className="mono-label text-muted-foreground block mb-1.5 text-xs">Recipient Target</label>
              <select 
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-primary/50 transition-colors"
              >
                <option value="EVERYONE">Everyone (All Users & Partners)</option>
                <option value="PATIENTS">All Patients</option>
                <option value="DOCTORS">All Doctors & Nurses</option>
                <option value="SPECIFIC">Specific User</option>
              </select>
            </div>

            {targetGroup === "SPECIFIC" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <label className="mono-label text-muted-foreground block mb-1.5 text-xs">Target Email</label>
                <input 
                  type="email" 
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="patient@healos.com"
                  className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-primary/50 transition-colors"
                />
              </motion.div>
            )}

            <div>
              <label className="mono-label text-muted-foreground block mb-1.5 text-xs">Notification Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Update or Promo Offer"
                className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="flex-1 min-h-30">
              <label className="mono-label text-muted-foreground block mb-1.5 text-xs">Message Body</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter the notification details here..."
                className="w-full h-full min-h-30 bg-background border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-primary/50 transition-colors resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSending}
              className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send Notification
            </button>
          </form>
        </motion.div>

        {/* Transmission History */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-primary"><Clock className="size-5" /></span>
              <h2 className="font-display font-semibold text-lg tracking-tight">Transmission History</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {isLoadingHistory ? (
              <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Activity className="size-8 opacity-20" />
                <p className="text-sm">No recent broadcasts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((n) => (
                  <div key={n._id} className="p-4 rounded-2xl border border-border/40 bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{n.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[10px] font-medium uppercase">
                        <Users className="size-3" /> {n.targetGroup}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-500" /> {n.readBy?.length || 0} read</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
