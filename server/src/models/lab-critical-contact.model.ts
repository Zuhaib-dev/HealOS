import mongoose, { Document, Schema } from "mongoose";

export interface ILabCriticalContact extends Document {
  name: string;
  role: string;
  phone: string;
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const labCriticalContactSchema = new Schema<ILabCriticalContact>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    priority: { type: Number, min: 1, max: 20, default: 1 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

labCriticalContactSchema.index({ active: 1, priority: 1 });

export const LabCriticalContact = mongoose.model<ILabCriticalContact>(
  "LabCriticalContact",
  labCriticalContactSchema,
);
