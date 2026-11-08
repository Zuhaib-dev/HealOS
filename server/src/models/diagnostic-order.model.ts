import mongoose, { Schema, Document } from "mongoose";
import { randomBytes } from "crypto";

export function generateSpecimenBarcode() {
  const day = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `LAB-${day}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export const SpecimenStatus = {
  AWAITING_COLLECTION: "AWAITING_COLLECTION",
  COLLECTED: "COLLECTED",
  RECEIVED: "RECEIVED",
  RECOLLECTION_REQUIRED: "RECOLLECTION_REQUIRED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export enum DiagnosticTestType {
  RADIOLOGY = "RADIOLOGY", // X-Ray, CT, MRI, Ultrasound
  PATHOLOGY = "PATHOLOGY", // Blood tests, Urine, Biopsy
}

export enum DiagnosticOrderPriority {
  ROUTINE = "ROUTINE",
  URGENT = "URGENT",
  STAT = "STAT", // Immediate emergency
}

export enum DiagnosticOrderStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  REPORTED = "REPORTED",
  CANCELLED = "CANCELLED",
}

export interface IDiagnosticOrder extends Document {
  patient?: mongoose.Types.ObjectId;
  emergencyCase?: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  consultation?: mongoose.Types.ObjectId; // Link to the consultation where it was ordered
  testType: DiagnosticTestType;
  testName: string; // e.g. "Chest X-Ray PA View", "CBC"
  priority: DiagnosticOrderPriority;
  clinicalNotes?: string; // Reason for test, e.g. "Rule out pneumonia"
  status: DiagnosticOrderStatus;
  invoice?: mongoose.Types.ObjectId;
  collectedAt?: Date;
  reportedAt?: Date;
  specimenBarcode?: string;
  specimenStatus?: (typeof SpecimenStatus)[keyof typeof SpecimenStatus];
  specimenHistory?: {
    event: string;
    barcode?: string;
    note?: string;
    performedBy: mongoose.Types.ObjectId;
    at: Date;
  }[];
  receivedAt?: Date;
  analyser?: mongoose.Types.ObjectId;
  analyserAssignedAt?: Date;
  recollectionCount?: number;

  // Radiology-specific fields
  accessionNumber?: string;
  modality?: "CT" | "MRI" | "X-Ray" | "US" | "Mammo" | "PET-CT";
  room?: string;
  tatMin?: number;
  slaMin?: number;
  radiologist?: string;

  createdAt: Date;
  updatedAt: Date;
}

const diagnosticOrderSchema = new Schema<IDiagnosticOrder>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User" },
    emergencyCase: { type: Schema.Types.ObjectId, ref: "EmergencyCase" },
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    consultation: { type: Schema.Types.ObjectId, ref: "Consultation" },
    testType: {
      type: String,
      enum: Object.values(DiagnosticTestType),
      required: true,
    },
    testName: { type: String, required: true },
    priority: {
      type: String,
      enum: Object.values(DiagnosticOrderPriority),
      default: DiagnosticOrderPriority.ROUTINE,
    },
    clinicalNotes: { type: String },
    status: {
      type: String,
      enum: Object.values(DiagnosticOrderStatus),
      default: DiagnosticOrderStatus.PENDING,
    },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    collectedAt: { type: Date },
    reportedAt: { type: Date },
    specimenBarcode: {
      type: String,
      default: function (this: IDiagnosticOrder) {
        return this.testType === DiagnosticTestType.PATHOLOGY
          ? generateSpecimenBarcode()
          : undefined;
      },
    },
    specimenStatus: {
      type: String,
      enum: Object.values(SpecimenStatus),
      default: function (this: IDiagnosticOrder) {
        return this.testType === DiagnosticTestType.PATHOLOGY
          ? SpecimenStatus.AWAITING_COLLECTION
          : undefined;
      },
    },
    specimenHistory: [
      {
        event: { type: String, required: true },
        barcode: { type: String },
        note: { type: String, trim: true, maxlength: 500 },
        performedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        at: { type: Date, required: true, default: Date.now },
      },
    ],
    receivedAt: { type: Date },
    analyser: { type: Schema.Types.ObjectId, ref: "LabAnalyser" },
    analyserAssignedAt: { type: Date },
    recollectionCount: { type: Number, min: 0, default: 0 },
    accessionNumber: { type: String },
    modality: {
      type: String,
      enum: ["CT", "MRI", "X-Ray", "US", "Mammo", "PET-CT"],
    },
    room: { type: String },
    tatMin: { type: Number },
    slaMin: { type: Number },
    radiologist: { type: String },
  },
  { timestamps: true },
);

diagnosticOrderSchema.index({ accessionNumber: 1 });
diagnosticOrderSchema.index(
  { specimenBarcode: 1 },
  { unique: true, sparse: true },
);
diagnosticOrderSchema.index({ analyser: 1, specimenStatus: 1, priority: 1 });
diagnosticOrderSchema.index({ patient: 1, createdAt: -1 });
diagnosticOrderSchema.index({ emergencyCase: 1, createdAt: -1 });
diagnosticOrderSchema.index({ status: 1, testType: 1 }); // For radiology/lab queues
diagnosticOrderSchema.pre("validate", function () {
  if (!this.patient && !this.emergencyCase) {
    this.invalidate("patient", "A patient or emergency case is required");
  }
});

export const DiagnosticOrder = mongoose.model<IDiagnosticOrder>(
  "DiagnosticOrder",
  diagnosticOrderSchema,
);
