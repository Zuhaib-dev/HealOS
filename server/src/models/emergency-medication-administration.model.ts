import mongoose, { Document, Schema } from "mongoose";

export type EmergencyMedicationAdministrationState =
  "GIVEN" | "HELD" | "REFUSED";

export interface IEmergencyMedicationAdministration extends Document {
  emergencyCase: mongoose.Types.ObjectId;
  consultation: mongoose.Types.ObjectId;
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;
  dose: string;
  route: string;
  state: EmergencyMedicationAdministrationState;
  recordedBy: mongoose.Types.ObjectId;
  recordedAt: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyMedicationAdministrationSchema =
  new Schema<IEmergencyMedicationAdministration>(
    {
      emergencyCase: {
        type: Schema.Types.ObjectId,
        ref: "EmergencyCase",
        required: true,
      },
      consultation: {
        type: Schema.Types.ObjectId,
        ref: "Consultation",
        required: true,
      },
      medicineId: { type: Schema.Types.ObjectId, required: true },
      medicineName: { type: String, required: true, trim: true },
      dose: { type: String, required: true, trim: true },
      route: { type: String, required: true, trim: true },
      state: {
        type: String,
        enum: ["GIVEN", "HELD", "REFUSED"],
        required: true,
      },
      recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      recordedAt: { type: Date, required: true, default: Date.now },
      note: { type: String, trim: true, maxlength: 1000 },
    },
    { timestamps: true },
  );

emergencyMedicationAdministrationSchema.index({
  emergencyCase: 1,
  recordedAt: -1,
});
emergencyMedicationAdministrationSchema.index({
  consultation: 1,
  medicineId: 1,
  recordedAt: -1,
});

export const EmergencyMedicationAdministration =
  mongoose.model<IEmergencyMedicationAdministration>(
    "EmergencyMedicationAdministration",
    emergencyMedicationAdministrationSchema,
  );
