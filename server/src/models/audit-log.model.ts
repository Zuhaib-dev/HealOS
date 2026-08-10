import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  actor: string;
  action: string;
  target?: string;
  level: "info" | "warn" | "crit";
  timestamp: Date;
}

const auditLogSchema = new Schema({
  actor: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String },
  level: { type: String, enum: ["info", "warn", "crit"], required: true, default: "info" },
  timestamp: { type: Date, default: Date.now },
});

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
