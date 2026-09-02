import mongoose, { Schema, Document } from "mongoose";

export interface IInboundAmbulance extends Document {
  unit: string;
  etaMinutes: number;
  presentingComplaint: string;
  esi: number;
  crew: string;
  observations: string;
  prealert: boolean;
  progress: number;
  assignedBay?: string;
  status: "en_route" | "arrived" | "diverted" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const inboundAmbulanceSchema = new Schema<IInboundAmbulance>(
  {
    unit: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    etaMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    presentingComplaint: {
      type: String,
      required: true,
      trim: true,
    },
    esi: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5],
      default: 2,
    },
    crew: {
      type: String,
      required: true,
      trim: true,
    },
    observations: {
      type: String,
      default: "obs pending",
      trim: true,
    },
    prealert: {
      type: Boolean,
      default: false,
      index: true,
    },
    progress: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    assignedBay: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["en_route", "arrived", "diverted", "cancelled"],
      default: "en_route",
      index: true,
    },
  },
  { timestamps: true }
);

export const InboundAmbulance = mongoose.model<IInboundAmbulance>(
  "InboundAmbulance",
  inboundAmbulanceSchema
);
