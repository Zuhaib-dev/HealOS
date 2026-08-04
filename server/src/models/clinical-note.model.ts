import mongoose, { Schema, Document } from "mongoose";

export interface IClinicalNote extends Document {
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  category: string; // e.g. "Progress Note", "Admission", "Discharge"
  content: string; // rich text or markdown
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const clinicalNoteSchema = new Schema<IClinicalNote>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    category: { type: String, default: "Progress Note" },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

clinicalNoteSchema.index({ patient: 1, createdAt: -1 });
clinicalNoteSchema.index({ doctor: 1, createdAt: -1 });

export const ClinicalNote = mongoose.model<IClinicalNote>("ClinicalNote", clinicalNoteSchema);
