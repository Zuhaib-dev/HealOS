"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, Eye, FileCheck } from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { toast } from "sonner";
import { openProtectedReport } from "@/lib/api/reports";
import { getFileUrl } from "@/lib/utils";

type HistoryData = {
  consultations?: Array<{
    _id: string;
    createdAt: string;
    status?: string;
    diagnosis?: string;
    chiefComplaint?: string;
    medicines?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  }>;
  diagnosticReports?: Array<{
    _id: string;
    title?: string;
    fileName?: string;
    testName?: string;
    createdAt: string;
    fileUrl?: string;
    reportUrl?: string;
  }>;
};

export function PatientChartDrawer({
  open,
  patientName,
  patientNote,
  historyLoading,
  historyData,
  canStartConsult,
  onClose,
  onStartConsult,
  onOpenReceipt,
}: {
  open: boolean;
  patientName: string;
  patientNote: string;
  historyLoading: boolean;
  historyData: HistoryData | null;
  canStartConsult: boolean;
  onClose: () => void;
  onStartConsult: () => void;
  onOpenReceipt: (
    consultation: NonNullable<HistoryData["consultations"]>[number],
  ) => void;
}) {
  const medicines =
    historyData?.consultations?.flatMap((c) => c.medicines || []) ?? [];

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-border/60 bg-background sm:w-125 lg:w-150"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {patientName}
                </h2>
                <p className="mono-label mt-1 text-[10px] text-muted-foreground">
                  {patientNote}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chart"
                className="flex size-10 shrink-0 items-center justify-center border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X className="size-4" />
              </button>
            </div>

            {canStartConsult ? (
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Chart is read-only until you start the note.
                </p>
                <ActionButton tone="solid" onClick={onStartConsult}>
                  Start consult
                </ActionButton>
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="mb-3 size-6 animate-spin" />
                  <p className="text-sm">Loading chart…</p>
                </div>
              ) : historyData ? (
                <div>
                  <section>
                    <p className="border-b border-border/40 px-5 py-3 font-display text-sm font-bold">
                      Past visits
                    </p>
                    {historyData.consultations?.length ? (
                      historyData.consultations.map((c) => (
                        <div
                          key={c._id}
                          className="border-b border-border/40 px-5 py-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="mono-label text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="mono-label text-[10px] text-muted-foreground">
                                {c.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(c as never)}
                                className="flex size-8 items-center justify-center border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                                title="View ticket"
                              >
                                <FileCheck className="size-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 text-sm font-semibold">
                            {c.diagnosis || "No diagnosis recorded"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {c.chiefComplaint}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="px-5 py-8 text-sm text-muted-foreground">
                        No past visits on file.
                      </p>
                    )}
                  </section>

                  <section>
                    <p className="border-b border-border/40 px-5 py-3 font-display text-sm font-bold">
                      Medicines
                    </p>
                    {medicines.length ? (
                      medicines.map((m, idx) => (
                        <div
                          key={`${m.name}-${idx}`}
                          className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {m.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.dosage} · {m.frequency}
                            </p>
                          </div>
                          <span className="mono-label shrink-0 text-[10px] text-muted-foreground">
                            {m.duration}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="px-5 py-8 text-sm text-muted-foreground">
                        No medicines on file.
                      </p>
                    )}
                  </section>

                  <section>
                    <p className="border-b border-border/40 px-5 py-3 font-display text-sm font-bold">
                      Reports
                    </p>
                    {historyData.diagnosticReports?.length ? (
                      historyData.diagnosticReports.map((r) => (
                        <div
                          key={r._id}
                          className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {r.title ||
                                r.fileName ||
                                r.testName ||
                                "Diagnostic report"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const url = r.fileUrl || r.reportUrl;
                              if (url && r._id) {
                                openProtectedReport(r._id).catch(() =>
                                  toast.error("Unable to open this report"),
                                );
                              } else if (url) {
                                window.open(
                                  getFileUrl(url),
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              } else {
                                toast.error("Document file not available");
                              }
                            }}
                            className="flex size-8 shrink-0 items-center justify-center border border-border/60 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40"
                            title="View report"
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="px-5 py-8 text-sm text-muted-foreground">
                        No reports on file.
                      </p>
                    )}
                  </section>
                </div>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Could not load this chart.
                </p>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
