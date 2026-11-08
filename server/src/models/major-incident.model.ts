import mongoose, { Schema, Document } from "mongoose";

export interface ICascadeStep {
  text: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export interface IMajorIncident extends Document {
  isConfigured: boolean;
  configuredAt?: Date;
  configuredBy?: string;
  isArmed: boolean;
  armedAt?: Date;
  armedBy?: string;
  surgeBeds?: number;
  theatresArmed?: number;
  staffRecalled?: number;
  steps: ICascadeStep[];
  createdAt: Date;
  updatedAt: Date;
}

const cascadeStepSchema = new Schema<ICascadeStep>({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: String },
});

const majorIncidentSchema = new Schema<IMajorIncident>(
  {
    isConfigured: {
      type: Boolean,
      default: false,
      index: true,
    },
    configuredAt: { type: Date },
    configuredBy: { type: String, trim: true },
    isArmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    armedAt: {
      type: Date,
    },
    armedBy: {
      type: String,
    },
    surgeBeds: {
      type: Number,
    },
    theatresArmed: {
      type: Number,
    },
    staffRecalled: {
      type: Number,
    },
    steps: [cascadeStepSchema],
  },
  { timestamps: true },
);

export const MajorIncident = mongoose.model<IMajorIncident>(
  "MajorIncident",
  majorIncidentSchema,
);
