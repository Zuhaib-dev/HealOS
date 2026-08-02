import mongoose, { Schema, Document } from "mongoose";

export interface IDiagnosticReport extends Document {
  order: mongoose.Types.ObjectId; // Link to the order
  patient: mongoose.Types.ObjectId;
  radiologist: mongoose.Types.ObjectId; // The lab tech/radiologist who uploaded it
  reportUrl: string; // URL to PDF/DICOM in cloud storage
  findings: string; // Summary of results
  isCritical: boolean; // Flag to alert doctor immediately
  createdAt: Date;
  updatedAt: Date;
}

const diagnosticReportSchema = new Schema<IDiagnosticReport>(
  {
    order: { type: Schema.Types.ObjectId, ref: "DiagnosticOrder", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    radiologist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportUrl: { type: String, required: true },
    findings: { type: String, required: true },
    isCritical: { type: Boolean, default: false },
  },
  { timestamps: true }
);

diagnosticReportSchema.index({ patient: 1, createdAt: -1 });

export const DiagnosticReport = mongoose.model<IDiagnosticReport>("DiagnosticReport", diagnosticReportSchema);
