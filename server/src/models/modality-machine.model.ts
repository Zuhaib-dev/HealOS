import mongoose, { Schema, Document } from "mongoose";

export interface IModalityMachine extends Document {
  room: string;
  modality: "CT" | "MRI" | "X-Ray" | "US" | "Mammo" | "PET-CT";
  state: "scanning" | "idle" | "maintenance" | "offline";
  vendor: string;
  queue: number;
  uptime: string;
  doseIndex: string;
  nextService: string;
  createdAt: Date;
  updatedAt: Date;
}

const modalityMachineSchema = new Schema<IModalityMachine>(
  {
    room: { type: String, required: true },
    modality: { type: String, enum: ["CT", "MRI", "X-Ray", "US", "Mammo", "PET-CT"], required: true },
    state: { type: String, enum: ["scanning", "idle", "maintenance", "offline"], required: true },
    vendor: { type: String, required: true },
    queue: { type: Number, default: 0 },
    uptime: { type: String },
    doseIndex: { type: String },
    nextService: { type: String },
  },
  { timestamps: true }
);

export const ModalityMachine = mongoose.model<IModalityMachine>("ModalityMachine", modalityMachineSchema);
