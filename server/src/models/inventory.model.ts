import mongoose, { Schema, Document } from "mongoose";

export interface IInventory extends Document {
  itemName: string;
  itemCode: string;
  category: string;
  currentStock: number;
  reservedStock: number;
  reorderThreshold: number;
  unit: string;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema(
  {
    itemName: { type: String, required: true },
    itemCode: { type: String, required: true, unique: true },
    category: { type: String, required: true, default: "General" },
    currentStock: { type: Number, required: true, default: 0 },
    reservedStock: { type: Number, min: 0, required: true, default: 0 },
    reorderThreshold: { type: Number, required: true, default: 10 },
    unit: { type: String, required: true },
    unitPrice: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

export const Inventory = mongoose.model<IInventory>(
  "Inventory",
  inventorySchema,
);
