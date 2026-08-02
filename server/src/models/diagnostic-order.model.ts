import mongoose, { Schema, Document } from "mongoose";

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
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  consultation?: mongoose.Types.ObjectId; // Link to the consultation where it was ordered
  testType: DiagnosticTestType;
  testName: string; // e.g. "Chest X-Ray PA View", "CBC"
  priority: DiagnosticOrderPriority;
  clinicalNotes?: string; // Reason for test, e.g. "Rule out pneumonia"
  status: DiagnosticOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const diagnosticOrderSchema = new Schema<IDiagnosticOrder>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
  },
  { timestamps: true }
);

diagnosticOrderSchema.index({ patient: 1, createdAt: -1 });
diagnosticOrderSchema.index({ status: 1, testType: 1 }); // For radiology/lab queues

export const DiagnosticOrder = mongoose.model<IDiagnosticOrder>("DiagnosticOrder", diagnosticOrderSchema);
