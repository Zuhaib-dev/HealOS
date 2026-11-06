import mongoose, { Schema, Document } from "mongoose";

export interface IDiagnosticReport extends Document {
  order: mongoose.Types.ObjectId; // Link to the order
  patient: mongoose.Types.ObjectId;
  radiologist?: mongoose.Types.ObjectId; // The lab tech/radiologist who uploaded it
  uploadedBy?: string; // string or ID
  reportUrl?: string; // URL to PDF/DICOM in cloud storage
  fileUrl?: string;
  fileName?: string;
  localFileName?: string;
  title?: string;
  fileSize?: string;
  comments?: string;
  findings?: string; // Summary of results
  isCritical?: boolean; // Flag to alert doctor immediately
  criticalCallback?: {
    clinician: string;
    contact?: mongoose.Types.ObjectId;
    readBackConfirmed: boolean;
    calledAt: Date;
    recordedBy: mongoose.Types.ObjectId;
    note?: string;
    escalationLevel?: number;
  };
  criticalDueAt?: Date;
  structuredResults?: {
    analyteCode: string;
    analyteName: string;
    value: string;
    numericValue?: number;
    unit?: string;
    referenceLow?: number;
    referenceHigh?: number;
    criticalLow?: number;
    criticalHigh?: number;
    previousValue?: number;
    deltaPercent?: number;
    deltaExceeded?: boolean;
    flag:
      | "NORMAL"
      | "LOW"
      | "HIGH"
      | "CRITICAL_LOW"
      | "CRITICAL_HIGH"
      | "UNREVIEWED";
    source: "MANUAL" | "INSTRUMENT";
    analyser?: mongoose.Types.ObjectId;
    externalResultId?: string;
    resultAt: Date;
    enteredBy?: mongoose.Types.ObjectId;
  }[];

  // Radiology specific fields for documents
  kind?:
    | "PDF report"
    | "DICOM series"
    | "Scanned request"
    | "Prior report"
    | "Consent";
  state?: "verified" | "pending sign" | "quarantined";
  pages?: number;

  createdAt: Date;
  updatedAt: Date;
}

const diagnosticReportSchema = new Schema<IDiagnosticReport>(
  {
    order: { type: Schema.Types.ObjectId, ref: "DiagnosticOrder" },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    radiologist: { type: Schema.Types.ObjectId, ref: "User" },
    uploadedBy: { type: String },
    reportUrl: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    localFileName: { type: String, select: false },
    title: { type: String },
    fileSize: { type: String },
    comments: { type: String },
    findings: { type: String },
    isCritical: { type: Boolean, default: false },
    criticalCallback: {
      clinician: { type: String, trim: true },
      contact: { type: Schema.Types.ObjectId, ref: "LabCriticalContact" },
      readBackConfirmed: { type: Boolean, default: false },
      calledAt: { type: Date },
      recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
      note: { type: String, trim: true, maxlength: 500 },
      escalationLevel: { type: Number, min: 1, max: 20 },
    },
    criticalDueAt: { type: Date },
    structuredResults: [
      {
        analyteCode: { type: String, required: true, trim: true },
        analyteName: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
        numericValue: { type: Number },
        unit: { type: String, trim: true },
        referenceLow: { type: Number },
        referenceHigh: { type: Number },
        criticalLow: { type: Number },
        criticalHigh: { type: Number },
        previousValue: { type: Number },
        deltaPercent: { type: Number },
        deltaExceeded: { type: Boolean, default: false },
        flag: {
          type: String,
          enum: [
            "NORMAL",
            "LOW",
            "HIGH",
            "CRITICAL_LOW",
            "CRITICAL_HIGH",
            "UNREVIEWED",
          ],
          required: true,
        },
        source: {
          type: String,
          enum: ["MANUAL", "INSTRUMENT"],
          required: true,
        },
        analyser: { type: Schema.Types.ObjectId, ref: "LabAnalyser" },
        externalResultId: { type: String, trim: true },
        resultAt: { type: Date, required: true },
        enteredBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    kind: {
      type: String,
      enum: [
        "PDF report",
        "DICOM series",
        "Scanned request",
        "Prior report",
        "Consent",
      ],
    },
    state: {
      type: String,
      enum: ["verified", "pending sign", "quarantined"],
      default: "pending sign",
    },
    pages: { type: Number, default: 0 },
  },
  { timestamps: true },
);

diagnosticReportSchema.index({ patient: 1, createdAt: -1 });

export const DiagnosticReport = mongoose.model<IDiagnosticReport>(
  "DiagnosticReport",
  diagnosticReportSchema,
);
