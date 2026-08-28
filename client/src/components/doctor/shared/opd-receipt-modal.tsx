"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Printer, Phone, MapPin, Pill, Syringe, ClipboardList, Calendar } from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";

interface OpdReceiptModalProps {
  consultation: any;
  patient: any;
  doctor: any;
  onClose: () => void;
}

export function OpdReceiptModal({ consultation, patient, doctor, onClose }: OpdReceiptModalProps) {
  if (!consultation) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6"
      >
        <div className="absolute inset-0" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border/60 flex flex-col hide-scrollbar"
        >
          {/* Header Controls (Hidden during print) */}
          <div className="sticky top-0 bg-card/90 backdrop-blur-sm border-b border-border/40 p-4 flex items-center justify-between z-10 print:hidden">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              OPD Consultation Ticket
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold"
              >
                <Printer className="size-4" /> Print
              </button>
              <button
                onClick={onClose}
                className="size-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Printable Receipt Area */}
          <div className="p-8 sm:p-12 bg-white text-black print:p-0 print:m-0" id="printable-receipt">
            {/* Hospital Header */}
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="size-12 bg-primary text-white rounded-xl flex items-center justify-center">
                   <HealOSLogo size={32} />
                </div>
                <div>
                  <h1 className="font-display font-black text-2xl tracking-tight text-black">HealOS Hospital</h1>
                  <p className="text-xs text-black/60 font-medium">Advanced Care Center</p>
                </div>
              </div>
              <div className="text-right text-xs text-black/70 space-y-1">
                <p className="flex items-center justify-end gap-1.5"><MapPin className="size-3" /> 123 Health Ave, Medical District</p>
                <p className="flex items-center justify-end gap-1.5"><Phone className="size-3" /> +1 (555) 019-8273</p>
                <p className="flex items-center justify-end gap-1.5 font-mono mt-2">Ticket #: {consultation._id?.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {/* Patient & Doctor Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider">Patient Details</p>
                <h3 className="font-bold text-lg text-black">{patient?.name || "Unknown Patient"}</h3>
                <p className="text-sm text-black/70 font-mono">ID: {patient?._id?.slice(-6).toUpperCase()}</p>
                {patient?.email && <p className="text-sm text-black/70">{patient.email}</p>}
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider">Attending Doctor</p>
                <h3 className="font-bold text-lg text-black">Dr. {doctor?.name || "Physician"}</h3>
                <p className="text-sm text-black/70">Date: {new Date(consultation.createdAt).toLocaleDateString()}</p>
                <p className="text-sm text-black/70">Time: {new Date(consultation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="border border-black/10 rounded-xl p-6 mb-8 bg-black/5">
              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider mb-2 flex items-center gap-1.5">
                  <Syringe className="size-3" /> Chief Complaint
                </p>
                <p className="text-sm font-medium text-black leading-relaxed">
                  {consultation.chiefComplaint || "No complaint recorded."}
                </p>
              </div>
              
              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider mb-2">Diagnosis</p>
                <p className="text-base font-bold text-black">
                  {consultation.diagnosis || "Pending Evaluation"}
                </p>
              </div>

              {consultation.advice && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider mb-2">Clinical Advice / Diet</p>
                  <p className="text-sm font-medium text-black leading-relaxed">
                    {consultation.advice}
                  </p>
                </div>
              )}
            </div>

            {/* Prescription */}
            <div className="mb-8">
              <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider mb-4 flex items-center gap-1.5 border-b border-black/10 pb-2">
                <Pill className="size-3" /> Rx - Prescription
              </p>
              
              {consultation.medicines && consultation.medicines.length > 0 ? (
                <div className="space-y-4">
                  {consultation.medicines.map((med: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between pb-4 border-b border-black/5 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-base text-black flex items-center gap-2">
                          <span className="text-black/30 text-xs font-mono">{idx + 1}.</span> {med.name}
                        </p>
                        <p className="text-sm text-black/70 mt-1">
                          {med.dosage} — {med.frequency}
                        </p>
                        {med.instructions && (
                          <p className="text-xs text-black/50 mt-1 italic">Note: {med.instructions}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-black/5 text-black font-mono text-xs px-2 py-1 rounded">
                          {med.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-black/50 italic">No medications prescribed during this visit.</p>
              )}
            </div>

            {/* Follow-up & Sign */}
            <div className="flex items-end justify-between mt-12 pt-8 border-t border-black/10">
              <div>
                {consultation.followUpDate && (
                  <div className="flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-700 px-3 py-2 rounded-lg font-semibold">
                    <Calendar className="size-4" />
                    Follow-up: {new Date(consultation.followUpDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="w-40 border-b border-black/20 border-dashed mb-2 h-10"></div>
                <p className="text-xs text-black/50 font-bold uppercase tracking-widest">Doctor's Signature</p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-12 text-center text-[10px] text-black/40 font-mono border-t border-black/5 pt-4">
              Generated by HealOS System • Valid for 30 days • Not for medico-legal purposes without stamp
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
