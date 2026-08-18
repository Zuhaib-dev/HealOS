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
}

const labAnalyserSchema = new Schema<ILabAnalyser>(
  {
    name: { type: String, required: true },
    discipline: { type: String, required: true },
    state: { type: String, enum: ["running", "idle", "qc-due", "fault"], default: "running" },
    queue: { type: Number, default: 0 },
    throughput: { type: String },
    qcLastPass: { type: String },
    uptime: { type: String },
  },
  { timestamps: true }
);

export const LabAnalyser = mongoose.model<ILabAnalyser>("LabAnalyser", labAnalyserSchema);
