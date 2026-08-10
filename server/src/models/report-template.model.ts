import mongoose, { Schema, Document } from "mongoose";

export interface IReportTemplate extends Document {
  label: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportTemplateSchema = new Schema<IReportTemplate>(
  {
    label: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

export const ReportTemplate = mongoose.model<IReportTemplate>("ReportTemplate", reportTemplateSchema);
