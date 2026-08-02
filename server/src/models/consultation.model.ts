import mongoose, { Schema, Document } from "mongoose";

export enum ConsultationStatus {
  DRAFT = "DRAFT",
  COMPLETED = "COMPLETED",
}

export interface IMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IConsultation extends Document {
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  chiefComplaint?: string;
  diagnosis?: string;
  advice?: string; // diet, lifestyle, etc.
  medicines: IMedicine[];
  status: ConsultationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true },
  instructions: { type: String },
}, { _id: false });

const consultationSchema = new Schema<IConsultation>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    chiefComplaint: { type: String },
    diagnosis: { type: String },
    advice: { type: String },
    medicines: { type: [medicineSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(ConsultationStatus),
      default: ConsultationStatus.DRAFT,
    },
  },
  { timestamps: true }
);

consultationSchema.index({ patient: 1, createdAt: -1 });
consultationSchema.index({ doctor: 1, createdAt: -1 });
consultationSchema.index({ appointment: 1 });

export const Consultation = mongoose.model<IConsultation>("Consultation", consultationSchema);
