import mongoose, { Schema, Document } from "mongoose";

export interface IInventory extends Document {
  itemName: string;
  itemCode: string;
  category: string;
  currentStock: number;
  reorderThreshold: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema(
  {
    itemName: { type: String, required: true },
    itemCode: { type: String, required: true, unique: true },
    category: { type: String, required: true, default: "General" },
    currentStock: { type: Number, required: true, default: 0 },
    reorderThreshold: { type: Number, required: true, default: 10 },
    unit: { type: String, required: true },
  },
  { timestamps: true }
);

export const Inventory = mongoose.model<IInventory>("Inventory", inventorySchema);
