"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Loader2,
  Activity,
  FileText,
  Pill as PillIcon,
  FileDigit,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
} from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import { useAuthStore } from "@/store/use-auth-store";
import {
  fetchDoctorAppointmentsApi,
  AppointmentRecord,
} from "@/lib/api/appointment";
import { toast } from "sonner";
import { openProtectedReport } from "@/lib/api/reports";
import { getPatientHistoryApi } from "@/lib/api/doctor";
import { formatTimeRange } from "@/lib/time-format";
import { ConsultationForm } from "@/components/doctor/shared/consultation-form";
import { OpdReceiptModal } from "@/components/doctor/shared/opd-receipt-modal";
import { getSocket } from "@/lib/socket";
import { getFileUrl } from "@/lib/utils";

/* ---------- 02 · My patients ---------- */

export function RoundsPanel() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer State
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRecord | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [showConsultation, setShowConsultation] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const { user } = useAuthStore();

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetchDoctorAppointmentsApi(1, 100);
      if (res.success && res.appointments) {
        // Only show CONFIRMED appointments in the waiting room
        setAppointments(
          res.appointments.filter((a: any) => a.status === "CONFIRMED"),
        );
      }
    } catch {
      toast.error("Failed to load waiting room");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();

    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => loadAppointments();
      socket.on("appointment_updated", handleUpdate);
      socket.on("appointment_created", handleUpdate);
      return () => {
        socket.off("appointment_updated", handleUpdate);
        socket.off("appointment_created", handleUpdate);
      };
    }
  }, []);

  const handleViewPatient = async (apt: AppointmentRecord) => {
    setSelectedAppointment(apt);
    setHistoryLoading(true);
    const patId =
      typeof apt.patient === "object" ? apt.patient._id : apt.patient;
    try {
      const res = await getPatientHistoryApi(patId as string);
      if (res.status === "success") {
        setHistoryData(res.data);
      }
    } catch {
      toast.error("Failed to load patient history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="pb-24">
      <DoctorHeader
        title="Patients"
        note="Accepted visits. Open a row to review history or start the note."
      />

      <div className="flex flex-col gap-px bg-border/60">
        {loading ? (
          <div className="bg-background px-4 py-16 text-center text-sm text-muted-foreground">
            Loading today’s list…
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-background px-4 py-16 text-center">
            <h3 className="font-display text-lg font-bold">No patients yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Accept a visit from Clinic to see it here.
            </p>
          </div>
        ) : (
          appointments.map((apt) => {
            const p =
              typeof apt.patient === "object"
                ? apt.patient
                : { name: "Unknown", _id: apt.patient, email: "" };
            return (
              <button
                key={apt._id}
                type="button"
                onClick={() => handleViewPatient(apt)}
                className="flex w-full items-center justify-between gap-4 bg-background px-4 py-4 text-left hover:bg-muted/40 sm:px-6"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-bold">
                    {p.name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-mono text-foreground">
                      <Clock className="size-3" />
                      {formatTimeRange(apt.timeSlot, apt.slotEndTime)}
                    </span>
                    <span className="line-clamp-1">{apt.reason}</span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })
        )}
      </div>

      {/* Slide-out Drawer for Patient History & Consultation */}
      <AnimatePresence>
        {selectedAppointment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppointment(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 h-full w-full sm:w-125 lg:w-150 bg-background border-l border-border/60 shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border/40 flex items-center justify-between bg-card">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    {typeof selectedAppointment.patient === "object"
                      ? selectedAppointment.patient.name
                      : "Patient"}
                  </h2>
                  <p className="mono-label text-muted-foreground mt-1 text-[10px]">
                    Appointment:{" "}
                    {formatTimeRange(
                      selectedAppointment.timeSlot,
                      selectedAppointment.slotEndTime,
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  aria-label="Close patient details panel"
                  title="Close patient details panel"
                  className="size-10 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="size-5" />
                  <span className="sr-only">Close patient details panel</span>
                </button>
              </div>

              <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex justify-end">
                <ActionButton
                  tone="solid"
                  onClick={() => setShowConsultation(true)}
                >
                  + Start Consultation
                </ActionButton>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-muted/10 custom-scrollbar">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="size-8 animate-spin mb-4" />
                    <p className="mono-label">Loading Medical History...</p>
                  </div>
                ) : historyData ? (
                  <div className="space-y-8">
                    {/* Consultations */}
                    <section>
                      <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Activity className="size-4 text-primary" /> Past Visits
                      </h3>
                      <div className="space-y-3">
                        {historyData.consultations?.length > 0 ? (
                          historyData.consultations.map((c: any) => (
                            <div
                              key={c._id}
                              className="bg-card border border-border/60 rounded-xl p-4 shadow-sm group hover:border-primary/50 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="mono-label text-xs font-bold">
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {c.status}
                                  </span>
                                  <button
                                    onClick={() => setSelectedReceipt(c)}
                                    className="size-6 bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground rounded flex items-center justify-center transition-colors"
                                    title="View Ticket"
                                  >
                                    <FileCheck className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm font-semibold mb-1">
                                Dx: {c.diagnosis || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {c.chiefComplaint}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No past visits recorded.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* Medicines from Consultations */}
                    <section>
                      <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <PillIcon className="size-4 text-emerald-500" />{" "}
                        Prescribed Medications
                      </h3>
                      <div className="space-y-2">
                        {historyData.consultations?.flatMap(
                          (c: any) => c.medicines || [],
                        ).length > 0 ? (
                          historyData.consultations
                            .flatMap((c: any) => c.medicines || [])
                            .map((m: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-card border border-border/60 rounded-lg p-3 flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-bold text-sm">{m.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {m.dosage} • {m.frequency}
                                  </p>
                                </div>
                                <span className="text-[10px] bg-muted px-2 py-1 rounded font-mono">
                                  {m.duration}
                                </span>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No medications prescribed.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* Reports */}
                    <section>
                      <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText className="size-4 text-indigo-500" />{" "}
                        Diagnostic Reports
                      </h3>
                      <div className="space-y-3">
                        {historyData.diagnosticReports?.length > 0 ? (
                          historyData.diagnosticReports.map((r: any) => (
                            <div
                              key={r._id}
                              className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center gap-4"
                            >
                              <div className="size-10 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                                <FileDigit className="size-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-sm">
                                  {r.title ||
                                    r.fileName ||
                                    r.testName ||
                                    "Diagnostic Report"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded:{" "}
                                  {new Date(r.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
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
                                className="size-8 rounded-md bg-foreground/5 hover:bg-foreground/10 text-foreground flex items-center justify-center shrink-0 transition-colors"
                                title="View Document"
                              >
                                <Eye className="size-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No reports available.
                          </p>
                        )}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    Failed to load data.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Embedded Consultation Form */}
      {showConsultation && selectedAppointment && (
        <ConsultationForm
          appointment={selectedAppointment}
          onBack={() => setShowConsultation(false)}
          onComplete={() => {
            setShowConsultation(false);
            setSelectedAppointment(null);
            loadAppointments(); // refresh waiting room (the appointment is now COMPLETED, so it will disappear)
          }}
        />
      )}

      {/* OPD Receipt Modal */}
      {selectedReceipt && selectedAppointment && (
        <OpdReceiptModal
          consultation={selectedReceipt}
          patient={selectedAppointment.patient}
          doctor={user}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
