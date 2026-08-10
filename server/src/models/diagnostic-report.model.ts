import mongoose, { Schema, Document } from "mongoose";

export interface IDiagnosticReport extends Document {
  order: mongoose.Types.ObjectId; // Link to the order
  patient: mongoose.Types.ObjectId;
  radiologist?: mongoose.Types.ObjectId; // The lab tech/radiologist who uploaded it
  uploadedBy?: string; // string or ID
  reportUrl?: string; // URL to PDF/DICOM in cloud storage
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  comments?: string;
  findings?: string; // Summary of results
  isCritical?: boolean; // Flag to alert doctor immediately
  
  // Radiology specific fields for documents
  kind?: "PDF report" | "DICOM series" | "Scanned request" | "Prior report" | "Consent";
  state?: "verified" | "pending sign" | "quarantined";
  pages?: number;

  createdAt: Date;
  updatedAt: Date;
}

const diagnosticReportSchema = new Schema<IDiagnosticReport>(
  {
    order: { type: Schema.Types.ObjectId, ref: "DiagnosticOrder", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    radiologist: { type: Schema.Types.ObjectId, ref: "User" },
    uploadedBy: { type: String },
    reportUrl: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: String },
    comments: { type: String },
    findings: { type: String },
    isCritical: { type: Boolean, default: false },
    kind: { type: String, enum: ["PDF report", "DICOM series", "Scanned request", "Prior report", "Consent"] },
    state: { type: String, enum: ["verified", "pending sign", "quarantined"], default: "pending sign" },
    pages: { type: Number, default: 0 },
  },
  { timestamps: true }
);

diagnosticReportSchema.index({ patient: 1, createdAt: -1 });

export const DiagnosticReport = mongoose.model<IDiagnosticReport>("DiagnosticReport", diagnosticReportSchema);
