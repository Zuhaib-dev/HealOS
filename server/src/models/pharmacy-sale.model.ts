import mongoose, { Document, Schema } from "mongoose";

export type PharmacySaleStatus =
  "AWAITING_PAYMENT" | "DISPENSING" | "DISPENSED";

export interface IPharmacySale extends Document {
  consultation: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  invoice: mongoose.Types.ObjectId;
  pharmacist: mongoose.Types.ObjectId;
  dispensedBy?: mongoose.Types.ObjectId;
  items: {
    medicineId?: mongoose.Types.ObjectId;
    inventoryItem: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number;
  status: PharmacySaleStatus;
  dispensedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pharmacySaleSchema = new Schema<IPharmacySale>(
  {
    consultation: {
      type: Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
    },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      unique: true,
    },
    pharmacist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dispensedBy: { type: Schema.Types.ObjectId, ref: "User" },
    items: [
      {
        medicineId: { type: Schema.Types.ObjectId },
        inventoryItem: {
          type: Schema.Types.ObjectId,
          ref: "Inventory",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, min: 1, required: true },
        unitPrice: { type: Number, min: 0, required: true },
        amount: { type: Number, min: 0, required: true },
      },
    ],
    totalAmount: { type: Number, min: 0.01, required: true },
    status: {
      type: String,
      enum: ["AWAITING_PAYMENT", "DISPENSING", "DISPENSED"],
      default: "AWAITING_PAYMENT",
    },
    dispensedAt: { type: Date },
  },
  { timestamps: true },
);

pharmacySaleSchema.index({ status: 1, createdAt: -1 });
pharmacySaleSchema.index({ consultation: 1 }, { unique: true });

export const PharmacySale = mongoose.model<IPharmacySale>(
  "PharmacySale",
  pharmacySaleSchema,
);
