"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Sparkles,
  Loader2,
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
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";

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

/* ---------- 04 reports ---------- */

export function ReportsPanel() {
  const [q, setQ] = useState("");
  const { data, isLoading, refetch } = usePatientDashboard();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");

  // AI Explainer State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedReportForAi, setSelectedReportForAi] = useState<{name: string, url: string} | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, isChatting]);

  const handleExplainReport = async (name: string, url: string) => {
    setSelectedReportForAi({ name, url });
    setIsAiModalOpen(true);
    setAiExplanation("");
    setChatMessages([]);
    setChatInput("");
    setIsExplaining(true);

    try {
      const token = useAuthStore.getState().token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/ai/explain-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileUrl: url }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAiExplanation(json.explanation);
      } else {
        throw new Error(json.message || "Failed to explain report");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during AI processing");
      setIsAiModalOpen(false);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatting || !selectedReportForAi) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatting(true);

    try {
      const token = useAuthStore.getState().token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      
      // We pass the initial prompt implicitly as history to Gemini if we wanted to, 
      // but to keep it simple, we just pass the user's explicit chat questions 
      // + the file URL so Gemini can re-read the file in the new context.
      const apiMessages = [
        ...chatMessages,
        { role: 'user', text: userMessage }
      ];

      const res = await fetch(`${apiUrl}/ai/chat-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          fileUrl: selectedReportForAi.url
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setChatMessages(prev => [...prev, { role: 'model', text: json.text }]);
      } else {
        throw new Error(json.message || "Failed to get response");
      }
    } catch (err: any) {
      toast.error(err.message || "Chat error occurred");
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25 MB limit");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      if (uploadTitle.trim()) {
        formData.append("title", uploadTitle.trim());
      }

      const token = useAuthStore.getState().token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/patient/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        toast.success("Document uploaded successfully");
        refetch();
      } else {
        throw new Error(json.message || "Failed to upload document");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
      setUploadTitle("");
      e.target.value = ""; // Reset input
    }
  };

  const orders = data?.diagnosticOrders || [];
  const reports = data?.diagnosticReports || [];

  const getFullFileUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:5001";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const allRecords = [
    ...orders.filter((o: any) => o.status !== "REPORTED").map((o: any) => ({
      id: o._id,
      name: o.testName,
      kind: o.testType,
      dept: o.doctor?.name ? `Dr. ${o.doctor.name}` : "Doctor",
      date: o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "N/A",
      status: "pending",
      flagged: false,
      pages: 0,
      size: "",
      fileUrl: getFullFileUrl(o.fileUrl)
    })),
    ...reports.map((r: any) => ({
      id: r._id,
      name: r.order?.testName || r.title || "Uploaded Report",
      kind: r.order?.testType || "REPORT",
      dept: r.uploadedBy?.name ? r.uploadedBy.name : "Lab / Radiology",
      date: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "N/A",
      status: "ready",
      flagged: false, // We could add logic for flags later
      pages: 1,
      size: "PDF",
      fileUrl: getFullFileUrl(r.fileUrl)
    }))
  ];

  const rows = allRecords.filter((r) =>
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
        <label htmlFor="patient-reports-filter" className="sr-only">Filter reports</label>
        <input
          id="patient-reports-filter"
          aria-label="Filter reports"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter reports"
          className="hairline mono-label placeholder:text-muted-foreground w-full max-w-sm bg-transparent px-3 py-2.5 outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
        />
        <span className="mono-label text-muted-foreground">
          {rows.length} records found
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-215">
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                      <FileText className="size-6 text-muted-foreground/60" />
                    </div>
                    <p className="mono-label text-muted-foreground">No records found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hairline-b hover:bg-foreground/2">
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
                      tone={r.status === "ready" ? "ok" : "warn"}
                    >
                      {r.status}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="text-muted-foreground flex items-center gap-3">
                      {r.fileUrl ? (
                        <>
                          <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" aria-label="View" className="hover:text-foreground">
                            <Eye className="size-3.5" />
                          </a>
                          <a href={r.fileUrl} download aria-label="Download" className="hover:text-foreground">
                            <Download className="size-3.5" />
                          </a>
                        </>
                      ) : (
                        <>
                          <button type="button" aria-label="View" className="hover:text-foreground opacity-50 cursor-not-allowed">
                            <Eye className="size-3.5" />
                          </button>
                          <button type="button" aria-label="Download" className="hover:text-foreground opacity-50 cursor-not-allowed">
                            <Download className="size-3.5" />
                          </button>
                        </>
                      )}
                      {r.fileUrl && (
                        <button 
                          type="button" 
                          aria-label="Explain with AI" 
                          className="hover:text-amber-500 text-amber-500/70 transition-colors flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full"
                          onClick={() => handleExplainReport(r.name, r.fileUrl!)}
                        >
                          <Sparkles className="size-3.5" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Explain</span>
                        </button>
                      )}
                      <button type="button" aria-label="Share" className="hover:text-foreground">
                        <Share2 className="size-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
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
          <div className="flex items-center gap-3">
            <label htmlFor="patient-upload-report-title" className="sr-only">Report name</label>
            <input 
              id="patient-upload-report-title"
              aria-label="Report name (optional)"
              type="text" 
              placeholder="Report name (optional)" 
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              disabled={isUploading}
              className="hairline mono-label placeholder:text-muted-foreground bg-transparent px-3 py-2 outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm w-48 text-xs"
            />
            <label htmlFor="patient-report-file-input" className={`relative overflow-hidden cursor-pointer flex items-center justify-center px-4 py-2 bg-foreground text-background font-bold text-xs uppercase tracking-wider rounded-lg transition-all ${isUploading ? "opacity-70 cursor-wait" : "hover:bg-foreground/90"}`}>
              {isUploading ? "Uploading..." : "Upload"}
              <input
                id="patient-report-file-input"
                aria-label="Upload document file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.dcm"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      </div>

      {/* AI Explainer Modal */}
      <AnimatePresence>
        {isAiModalOpen && selectedReportForAi && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm overflow-y-auto"
          >
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
              <button
                type="button"
                aria-label="Close dialog backdrop"
                onClick={() => setIsAiModalOpen(false)}
                className="fixed inset-0 w-full h-full bg-transparent border-0 cursor-default outline-none"
              />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl text-left bg-card rounded-2xl shadow-2xl border border-amber-500/30 flex flex-col z-10 overflow-hidden"
              >
                {/* Header */}
                <div className="sticky top-0 bg-background/80 backdrop-blur-xl border-b border-border/50 p-5 sm:p-6 flex items-start justify-between z-50">
                  <div className="flex gap-4 items-center">
                    <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                      <Sparkles className="size-6" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-xl text-foreground flex items-center gap-2">
                        AI Lab Report Explainer
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Simplifying: <span className="font-medium text-foreground">{selectedReportForAi.name}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="size-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 relative min-h-75 bg-linear-to-b from-background to-muted/20">
                  {isExplaining ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                        <Loader2 className="size-10 animate-spin text-amber-500 relative z-10" />
                      </div>
                      <p className="text-sm font-medium text-foreground/80 animate-pulse">Gemini is translating medical jargon...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-none text-foreground/90 leading-relaxed">
                      {aiExplanation.split('\\n').map((line, i) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine === '' || trimmedLine.match(/^[-_*]{3,}$/)) return null; // Skip empty lines and horizontal rules
                        
                        if (trimmedLine.startsWith('### ')) {
                          return <h3 key={i} className="text-lg font-display font-semibold text-foreground mt-8 mb-3 flex items-center gap-2">{trimmedLine.replace('### ', '')}</h3>;
                        }
                        if (trimmedLine.startsWith('## ')) {
                          return <h2 key={i} className="text-xl font-display font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border/50">{trimmedLine.replace('## ', '')}</h2>;
                        }
                        if (trimmedLine.startsWith('# ')) {
                          return <h1 key={i} className="text-2xl font-display font-bold text-foreground mt-8 mb-4">{trimmedLine.replace('# ', '')}</h1>;
                        }
                        if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                          const listItemText = trimmedLine.substring(2);
                          // Parse bold in lists
                          const parts = listItemText.split(/(\\*\\*.*?\\*\\*)/g);
                          return (
                            <li key={i} className="ml-6 mb-2 list-disc pl-1 marker:text-amber-500">
                              {parts.map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                              })}
                            </li>
                          );
                        }
                        
                        // Basic bold parsing for paragraphs
                        const parts = trimmedLine.split(/(\\*\\*.*?\\*\\*)/g);
                        return (
                          <p key={i} className="mb-3 text-[15px]">
                            {parts.map((part, j) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Chat History */}
                  {!isExplaining && aiExplanation && chatMessages.length > 0 && (
                    <div className="mt-8 space-y-4 border-t border-border/50 pt-6">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user' 
                              ? 'bg-foreground text-background rounded-br-sm' 
                              : 'bg-muted border border-border/50 text-foreground/90 rounded-bl-sm'
                          }`}>
                            <p className="text-[15px] leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      {isChatting && (
                        <div className="flex justify-start">
                          <div className="bg-muted border border-border/50 rounded-2xl rounded-bl-sm px-4 py-4 flex items-center gap-2">
                            <div className="size-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="size-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="size-1.5 bg-foreground/40 rounded-full animate-bounce" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                {!isExplaining && aiExplanation && (
                  <div className="p-4 sm:p-5 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                    <form onSubmit={handleSendChatMessage} className="flex items-center gap-3">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="flex-1 bg-muted/50 border border-border/50 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-shadow placeholder:text-muted-foreground/70"
                        disabled={isChatting}
                      />
                      <button 
                        type="submit" 
                        disabled={!chatInput.trim() || isChatting}
                        className="size-10 shrink-0 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white flex items-center justify-center transition-colors"
                      >
                        <Send className="size-4 -ml-0.5" />
                      </button>
                    </form>
                  </div>
                )}

                {/* Footer Disclaimer */}
                <div className="bg-muted/50 border-t border-border p-4 sm:p-5 flex items-center justify-center gap-2">
                  <TriangleAlert className="size-4 text-amber-500/70" />
                  <p className="text-xs text-muted-foreground font-medium">
                    This explanation was generated by AI and is not medical advice. Always consult your doctor.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
