import mongoose, { Document, Schema } from "mongoose";

export interface IEmergencyObservation extends Document {
  emergencyCase: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperatureC?: number;
  glasgowComaScale?: number;
  painScore?: number;
  note?: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyObservationSchema = new Schema<IEmergencyObservation>(
  {
    emergencyCase: {
      type: Schema.Types.ObjectId,
      ref: "EmergencyCase",
      required: true,
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    heartRate: { type: Number, min: 0, max: 300 },
    systolicBP: { type: Number, min: 0, max: 350 },
    diastolicBP: { type: Number, min: 0, max: 250 },
    respiratoryRate: { type: Number, min: 0, max: 100 },
    oxygenSaturation: { type: Number, min: 0, max: 100 },
    temperatureC: { type: Number, min: 25, max: 45 },
    glasgowComaScale: {
      type: Number,
      min: 3,
      max: 15,
      validate: Number.isInteger,
    },
    painScore: { type: Number, min: 0, max: 10, validate: Number.isInteger },
    note: { type: String, trim: true, maxlength: 1000 },
    recordedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);

emergencyObservationSchema.index({ emergencyCase: 1, recordedAt: -1 });

export const EmergencyObservation = mongoose.model<IEmergencyObservation>(
  "EmergencyObservation",
  emergencyObservationSchema,
);
