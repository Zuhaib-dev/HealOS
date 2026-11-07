"use client";

import { useEffect, useState, useRef } from "react";
import {
  Download,
  Eye,
  FileText,
  TriangleAlert,
  X,
  Send,
  UploadCloud,
  Sparkles,
  Loader2,
} from "lucide-react";
import { PatientHeader } from "@/components/patient/patient-header";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { usePatientRecords } from "@/hooks/use-patient-lists";
import { openProtectedReport } from "@/lib/api/reports";

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
  return (
    <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

/* ---------- 04 reports ---------- */

export function ReportsPanel() {
  const [q, setQ] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading, refetch } = usePatientRecords(
    page,
    pageSize,
    debouncedQuery,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");

  // AI Explainer State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedReportForAi, setSelectedReportForAi] = useState<{
    name: string;
    url: string;
    reportId?: string;
  } | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "model"; text: string }[]
  >([]);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(q.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const handleExplainReport = async (
    name: string,
    url: string,
    reportId?: string,
  ) => {
    setSelectedReportForAi({ name, url, reportId });
    setIsAiModalOpen(true);
    setAiExplanation("");
    setChatMessages([]);
    setChatInput("");
    setIsExplaining(true);

    try {
      const token = useAuthStore.getState().token;
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/ai/explain-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(reportId ? { reportId: String(reportId) } : {}),
          ...(url ? { fileUrl: url } : {}),
        }),
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
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsChatting(true);

    try {
      const token = useAuthStore.getState().token;
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

      // We pass the initial prompt implicitly as history to Gemini if we wanted to,
      // but to keep it simple, we just pass the user's explicit chat questions
      // + the file URL so Gemini can re-read the file in the new context.
      const apiMessages = [
        ...chatMessages,
        { role: "user", text: userMessage },
      ];

      const res = await fetch(`${apiUrl}/ai/chat-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          ...(selectedReportForAi.reportId
            ? { reportId: String(selectedReportForAi.reportId) }
            : {}),
          ...(selectedReportForAi.url
            ? { fileUrl: selectedReportForAi.url }
            : {}),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setChatMessages((prev) => [
          ...prev,
          { role: "model", text: json.text },
        ]);
      } else {
        throw new Error(json.message || "Failed to get response");
      }
    } catch (err: any) {
      toast.error(err.message || "Chat error occurred");
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Sorry, I encountered an error. Please try again.",
        },
      ]);
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
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
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

  const getFullFileUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      "http://localhost:5001";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const rows = (data?.records || []).map((record) => ({
    ...record,
    date: record.date
      ? new Date(record.date).toISOString().split("T")[0]
      : "N/A",
    fileUrl: getFullFileUrl(record.fileUrl),
  }));
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  return (
    <section className="pb-24 lg:pb-0">
      <PatientHeader
        title="Records"
        note="Lab and imaging reports, letters, and prescriptions."
      />

      <div className="hairline-b flex flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
        <label htmlFor="patient-reports-filter" className="sr-only">
          Filter reports
        </label>
        <input
          id="patient-reports-filter"
          aria-label="Filter reports"
          title="Filter reports"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter reports"
          className="hairline mono-label placeholder:text-muted-foreground w-full max-w-sm bg-transparent px-3 py-2.5 outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
        />
        <span className="mono-label text-muted-foreground">
          {data?.total || 0} records found
        </span>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        {isLoading ? (
          <div className="h-32 animate-pulse bg-foreground/4" />
        ) : rows.length === 0 ? (
          <p className="border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No records found.
          </p>
        ) : (
          rows.map((r) => (
            <article
              key={r.id}
              className="border border-border/60 bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{r.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.kind} · {r.dept} · {r.date}
                  </p>
                </div>
                <Pill tone={r.status === "ready" ? "ok" : "warn"}>
                  {r.status}
                </Pill>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.fileUrl ? (
                  <>
                    <button
                      type="button"
                      className="border border-border/60 px-3 py-1.5 text-xs font-semibold"
                      onClick={() =>
                        r.reportId
                          ? openProtectedReport(r.reportId).catch(() =>
                              toast.error("Unable to open this report"),
                            )
                          : window.open(
                              r.fileUrl || "",
                              "_blank",
                              "noopener,noreferrer",
                            )
                      }
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="border border-border/60 px-3 py-1.5 text-xs font-semibold"
                      onClick={() =>
                        r.reportId
                          ? openProtectedReport(r.reportId, true).catch(() =>
                              toast.error("Unable to download this report"),
                            )
                          : window.open(
                              r.fileUrl || "",
                              "_blank",
                              "noopener,noreferrer",
                            )
                      }
                    >
                      Download
                    </button>
                  </>
                ) : null}
                {r.fileUrl && r.reportId ? (
                  <button
                    type="button"
                    className="bg-accent/12 px-3 py-1.5 text-xs font-semibold text-brass"
                    onClick={() =>
                      handleExplainReport(r.name, r.fileUrl!, r.reportId)
                    }
                  >
                    Explain
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto lg:block">
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
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center text-sm text-muted-foreground"
                >
                  Loading records…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="border border-dashed border-border/60 bg-muted/40 p-4">
                      <FileText className="size-6 text-muted-foreground/60" />
                    </div>
                    <p className="mono-label text-muted-foreground">
                      No records found.
                    </p>
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
                    <span className="mono-label text-muted-foreground">
                      {r.kind}
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label">{r.dept}</span>
                  </Td>
                  <Td>
                    <span className="mono-label">{r.date}</span>
                  </Td>
                  <Td>
                    <Pill tone={r.status === "ready" ? "ok" : "warn"}>
                      {r.status}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="text-muted-foreground flex items-center gap-3">
                      {r.fileUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              r.reportId
                                ? openProtectedReport(r.reportId).catch(() =>
                                    toast.error("Unable to open this report"),
                                  )
                                : window.open(
                                    r.fileUrl || "",
                                    "_blank",
                                    "noopener,noreferrer",
                                  )
                            }
                            aria-label="View"
                            title="View Report"
                            className="hover:text-foreground"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              r.reportId
                                ? openProtectedReport(r.reportId, true).catch(
                                    () =>
                                      toast.error(
                                        "Unable to download this report",
                                      ),
                                  )
                                : window.open(
                                    r.fileUrl || "",
                                    "_blank",
                                    "noopener,noreferrer",
                                  )
                            }
                            aria-label="Download"
                            title="Download Report"
                            className="hover:text-foreground"
                          >
                            <Download className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label="View"
                            title="View Report"
                            className="hover:text-foreground opacity-50 cursor-not-allowed"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Download"
                            title="Download Report"
                            className="hover:text-foreground opacity-50 cursor-not-allowed"
                          >
                            <Download className="size-3.5" />
                          </button>
                        </>
                      )}
                      {r.fileUrl && r.reportId && (
                        <button
                          type="button"
                          aria-label="Explain with AI"
                          title="Explain with AI"
                          className="flex items-center gap-1 bg-accent/12 px-2 py-1 text-brass hover:bg-accent/20"
                          onClick={() =>
                            handleExplainReport(r.name, r.fileUrl!, r.reportId)
                          }
                        >
                          <Sparkles className="size-3.5" />
                          <span className="text-[10px] font-bold tracking-wider uppercase">
                            Explain
                          </span>
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="hairline-t flex items-center justify-center gap-3 p-4">
          <button
            type="button"
            className="hairline px-3 py-2 text-xs disabled:opacity-40"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span className="mono-label text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="hairline px-3 py-2 text-xs disabled:opacity-40"
            disabled={page >= totalPages || isLoading}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
          </button>
        </div>
      ) : null}

      <div className="hairline-t p-5 sm:p-8">
        <div className="hairline flex flex-wrap items-center gap-4 p-5">
          <UploadCloud className="text-accent size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bring your own documents</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Outside reports, old prescriptions or insurance papers — add them
              so your team sees them before the visit. PDF or photo, up to 25
              MB.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="patient-upload-report-title" className="sr-only">
              Report name
            </label>
            <input
              id="patient-upload-report-title"
              aria-label="Report name (optional)"
              title="Report name (optional)"
              type="text"
              placeholder="Report name (optional)"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              disabled={isUploading}
              className="hairline mono-label placeholder:text-muted-foreground bg-transparent px-3 py-2 outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm w-48 text-xs"
            />
            <label
              htmlFor="patient-report-file-input"
              className={`relative flex cursor-pointer items-center justify-center overflow-hidden bg-foreground px-4 py-2 text-xs font-bold tracking-wider text-background uppercase transition-colors ${isUploading ? "cursor-wait opacity-70" : "hover:bg-foreground/90"}`}
            >
              {isUploading ? "Uploading..." : "Upload"}
              <input
                id="patient-report-file-input"
                aria-label="Upload document file"
                title="Upload document file"
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

      {isAiModalOpen && selectedReportForAi ? (
        <div className="fixed inset-0 z-100 overflow-y-auto bg-background/80">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
            <button
              type="button"
              aria-label="Close dialog backdrop"
              title="Close dialog backdrop"
              onClick={() => setIsAiModalOpen(false)}
              className="fixed inset-0 h-full w-full cursor-default border-0 bg-transparent outline-none"
            />

            <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden border border-border bg-card text-left">
              <div className="sticky top-0 z-50 flex items-start justify-between border-b border-border/50 bg-background/90 p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center border border-border/60 bg-accent/12 text-brass">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      Lab report explainer
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Simplifying:{" "}
                      <span className="font-medium text-foreground">
                        {selectedReportForAi.name}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="mt-1 grid size-8 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="relative min-h-75 p-6 sm:p-8">
                {isExplaining ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="size-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">
                      Reading this report…
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-none text-foreground/90 leading-relaxed">
                    {aiExplanation.split("\\n").map((line, i) => {
                      const trimmedLine = line.trim();
                      if (
                        trimmedLine === "" ||
                        trimmedLine.match(/^[-_*]{3,}$/)
                      )
                        return null; // Skip empty lines and horizontal rules

                      if (trimmedLine.startsWith("### ")) {
                        return (
                          <h3
                            key={i}
                            className="text-lg font-display font-semibold text-foreground mt-8 mb-3 flex items-center gap-2"
                          >
                            {trimmedLine.replace("### ", "")}
                          </h3>
                        );
                      }
                      if (trimmedLine.startsWith("## ")) {
                        return (
                          <h2
                            key={i}
                            className="text-xl font-display font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border/50"
                          >
                            {trimmedLine.replace("## ", "")}
                          </h2>
                        );
                      }
                      if (trimmedLine.startsWith("# ")) {
                        return (
                          <h1
                            key={i}
                            className="text-2xl font-display font-bold text-foreground mt-8 mb-4"
                          >
                            {trimmedLine.replace("# ", "")}
                          </h1>
                        );
                      }
                      if (
                        trimmedLine.startsWith("* ") ||
                        trimmedLine.startsWith("- ")
                      ) {
                        const listItemText = trimmedLine.substring(2);
                        // Parse bold in lists
                        const parts = listItemText.split(/(\\*\\*.*?\\*\\*)/g);
                        return (
                          <li
                            key={i}
                            className="mb-2 ml-6 list-disc pl-1 marker:text-accent"
                          >
                            {parts.map((part, j) => {
                              if (
                                part.startsWith("**") &&
                                part.endsWith("**")
                              ) {
                                return (
                                  <strong
                                    key={j}
                                    className="text-foreground font-semibold"
                                  >
                                    {part.slice(2, -2)}
                                  </strong>
                                );
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
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return (
                                <strong
                                  key={j}
                                  className="text-foreground font-semibold"
                                >
                                  {part.slice(2, -2)}
                                </strong>
                              );
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
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-foreground text-background"
                              : "border border-border/50 bg-muted text-foreground/90"
                          }`}
                        >
                          <p className="text-[15px] leading-relaxed">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 border border-border/50 bg-muted px-4 py-3">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              {!isExplaining && aiExplanation && (
                <div className="border-t border-border/50 bg-background p-4 sm:p-5">
                  <form
                    onSubmit={handleSendChatMessage}
                    className="flex items-center gap-3"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a follow-up question…"
                      className="flex-1 border border-border/50 bg-transparent px-4 py-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-primary/40 placeholder:text-muted-foreground/70"
                      disabled={isChatting}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatting}
                      className="grid size-10 shrink-0 place-items-center bg-foreground text-background disabled:opacity-50"
                    >
                      <Send className="size-4" />
                    </button>
                  </form>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 border-t border-border bg-muted/50 p-4 sm:p-5">
                <TriangleAlert className="size-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  This explanation was generated by AI and is not medical
                  advice. Always consult your doctor.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
