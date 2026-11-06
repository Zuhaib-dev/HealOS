import mongoose, { Schema, Document } from "mongoose";

export interface ILabAnalyser extends Document {
  name: string;
  discipline: string;
  state: "running" | "idle" | "qc-due" | "fault";
  queue: number;
  throughput: string;
  qcLastPass: string;
  uptime: string;
  createdAt: Date;
  updatedAt: Date;
  connectionState: "ONLINE" | "OFFLINE" | "MAINTENANCE";
  qcStatus: "PASS" | "FAIL" | "DUE";
  qcIntervalHours: number;
  qcLastPassedAt?: Date;
  integrationTokenHash?: string;
  lastSeenAt?: Date;
  qcRuns: {
    passed: boolean;
    controlLot: string;
    notes?: string;
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
  }[];
}

const labAnalyserSchema = new Schema<ILabAnalyser>(
  {
    name: { type: String, required: true },
    discipline: { type: String, required: true },
    state: {
      type: String,
      enum: ["running", "idle", "qc-due", "fault"],
      default: "running",
    },
    queue: { type: Number, default: 0 },
    throughput: { type: String },
    qcLastPass: { type: String },
    uptime: { type: String },
    connectionState: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "MAINTENANCE"],
      default: "OFFLINE",
    },
    qcStatus: { type: String, enum: ["PASS", "FAIL", "DUE"], default: "DUE" },
    qcIntervalHours: { type: Number, min: 1, max: 720, default: 24 },
    qcLastPassedAt: { type: Date },
    integrationTokenHash: { type: String, select: false },
    lastSeenAt: { type: Date },
    qcRuns: [
      {
        passed: { type: Boolean, required: true },
        controlLot: { type: String, required: true, trim: true },
        notes: { type: String, trim: true, maxlength: 500 },
        performedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        performedAt: { type: Date, required: true, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export const LabAnalyser = mongoose.model<ILabAnalyser>(
  "LabAnalyser",
  labAnalyserSchema,
);
