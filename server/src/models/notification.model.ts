import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  targetGroup: "EVERYONE" | "PATIENTS" | "DOCTORS" | "SPECIFIC";
  targetEmail?: string;
  sender: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetGroup: { type: String, enum: ["EVERYONE", "PATIENTS", "DOCTORS", "SPECIFIC"], required: true },
    targetEmail: { type: String },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
