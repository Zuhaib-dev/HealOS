"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Printer, Phone, MapPin, Pill, Syringe, ClipboardList, Calendar, Download, Loader2 } from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { toast } from "sonner";

interface OpdReceiptModalProps {
  consultation: any;
  patient: any;
  doctor: any;
  onClose: () => void;
}

export function OpdReceiptModal({ consultation, patient, doctor, onClose }: OpdReceiptModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!consultation) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const element = document.getElementById("printable-receipt");
      if (!element) throw new Error("Receipt element not found");

      // Dynamic import to avoid SSR issues
      const htmlToImage = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const imgData = await htmlToImage.toPng(element, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // Estimate height based on A4 aspect ratio if element dimensions aren't available, but it's better to read the element directly
      const elementHeight = element.offsetHeight;
      const elementWidth = element.offsetWidth;
      const pdfHeight = (elementHeight * pdfWidth) / elementWidth;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Consultation_Ticket_${patient?.name?.replace(/\s+/g, '_') || 'Patient'}.pdf`);
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
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
          {/* Header Controls */}
          <div className="sticky top-0 bg-card/90 backdrop-blur-sm border-b border-border/40 p-4 flex items-center justify-between z-10">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              OPD Consultation Ticket
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-70"
              >
                {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {isGenerating ? "Generating..." : "Download PDF"}
              </button>
              <button
                onClick={onClose}
                className="size-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Printable Receipt Area */}
          <div className="p-8 sm:p-12 bg-white text-slate-900 relative overflow-hidden" id="printable-receipt">
            
            {/* Aesthetic Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
              <HealOSLogo size={600} showWordmark={false} />
            </div>

            {/* Hospital Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-200 pb-8 mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="size-14 text-emerald-600 flex items-center justify-center">
                   <HealOSLogo size={42} showWordmark={false} />
                </div>
                <div>
                  <h1 className="font-display font-black text-3xl tracking-tight text-slate-900 mb-1">HealOS Hospital</h1>
                  <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">Advanced Care Center</p>
                </div>
              </div>
              <div className="text-right text-sm text-slate-500 space-y-1.5 mt-1">
                <p className="flex items-center justify-end gap-2"><MapPin className="size-3.5" /> 123 Health Ave, Medical District</p>
                <p className="flex items-center justify-end gap-2"><Phone className="size-3.5" /> +1 (555) 019-8273</p>
                <div className="mt-3 inline-block bg-slate-100 px-3 py-1 rounded-md">
                  <p className="font-mono text-xs font-bold text-slate-700">TICKET #: {consultation._id?.slice(-8).toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Patient & Doctor Info */}
            <div className="grid grid-cols-2 gap-8 mb-10 relative z-10">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Patient Details</p>
                <h3 className="font-bold text-xl text-slate-900">{patient?.name || "Unknown Patient"}</h3>
                <p className="text-sm text-slate-600 font-mono">ID: {patient?._id?.slice(-6).toUpperCase()}</p>
                {patient?.email && <p className="text-sm text-slate-600">{patient.email}</p>}
              </div>
              <div className="space-y-1.5 text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attending Doctor</p>
                <h3 className="font-bold text-xl text-slate-900">Dr. {doctor?.name || "Physician"}</h3>
                <p className="text-sm text-slate-600">Date: {new Date(consultation.createdAt).toLocaleDateString()}</p>
                <p className="text-sm text-slate-600">Time: {new Date(consultation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="border border-slate-200 rounded-2xl p-6 mb-10 bg-slate-50/50 backdrop-blur-sm relative z-10 shadow-sm">
              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                  <Syringe className="size-3.5" /> Chief Complaint
                </p>
                <p className="text-[15px] font-medium text-slate-800 leading-relaxed">
                  {consultation.chiefComplaint || "No complaint recorded."}
                </p>
              </div>
              
              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Diagnosis</p>
                <p className="text-lg font-bold text-slate-900">
                  {consultation.diagnosis || "Pending Evaluation"}
                </p>
              </div>

              {consultation.advice && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Clinical Advice / Diet</p>
                  <p className="text-[15px] font-medium text-slate-800 leading-relaxed">
                    {consultation.advice}
                  </p>
                </div>
              )}
            </div>

            {/* Prescription */}
            <div className="mb-10 relative z-10">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 flex items-center gap-1.5 border-b-2 border-slate-100 pb-3">
                <Pill className="size-4" /> Rx - Prescription
              </p>
              
              {consultation.medicines && consultation.medicines.length > 0 ? (
                <div className="space-y-4">
                  {consultation.medicines.map((med: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-[15px] text-slate-900 flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-mono w-4">{idx + 1}.</span> {med.name}
                        </p>
                        <p className="text-sm text-slate-600 mt-1 pl-6">
                          {med.dosage} — {med.frequency}
                        </p>
                        {med.instructions && (
                          <p className="text-xs text-slate-500 mt-1 italic pl-6">Note: {med.instructions}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-slate-100 text-slate-700 font-mono text-xs px-2.5 py-1 rounded-md">
                          {med.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">No medications prescribed during this visit.</p>
              )}
            </div>

            {/* Follow-up & Sign */}
            <div className="flex items-end justify-between mt-12 pt-8 border-t-2 border-slate-100 relative z-10">
              <div>
                {consultation.followUpDate && (
                  <div className="flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl border border-emerald-100 font-semibold shadow-sm">
                    <Calendar className="size-4" />
                    Follow-up: {new Date(consultation.followUpDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="w-48 border-b-2 border-slate-300 border-dashed mb-3 h-12"></div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Doctor's Signature</p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-12 text-center text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-6 relative z-10">
              Generated by HealOS System • Valid for 30 days • Not for medico-legal purposes without stamp
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
