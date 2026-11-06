"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Clock } from "lucide-react";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import { useAuthStore } from "@/store/use-auth-store";
import {
  fetchDoctorAppointmentsApi,
  AppointmentRecord,
} from "@/lib/api/appointment";
import { toast } from "sonner";
import { getPatientHistoryApi } from "@/lib/api/doctor";
import { formatTimeRange } from "@/lib/time-format";
import { ConsultationForm } from "@/components/doctor/shared/consultation-form";
import { OpdReceiptModal } from "@/components/doctor/shared/opd-receipt-modal";
import { PatientChartDrawer } from "@/components/doctor/shared/patient-chart-drawer";
import { getSocket } from "@/lib/socket";

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

      <PatientChartDrawer
        open={Boolean(selectedAppointment) && !showConsultation}
        patientName={
          selectedAppointment && typeof selectedAppointment.patient === "object"
            ? selectedAppointment.patient.name
            : "Patient"
        }
        patientNote={
          selectedAppointment
            ? formatTimeRange(
                selectedAppointment.timeSlot,
                selectedAppointment.slotEndTime,
              )
            : ""
        }
        historyLoading={historyLoading}
        historyData={historyData}
        canStartConsult={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        onStartConsult={() => setShowConsultation(true)}
        onOpenReceipt={(c) => setSelectedReceipt(c)}
      />

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
