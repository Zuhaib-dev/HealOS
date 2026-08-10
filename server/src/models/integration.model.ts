import mongoose, { Schema, Document } from "mongoose";

export interface IIntegration extends Document {
  type: "SERVICE" | "API_KEY";
  
  // For SERVICES
  name?: string;
  category?: string;
  status?: "connected" | "degraded" | "off";
  detail?: string;
  
  // For API_KEYS
  keyPrefix?: string;
  keyHash?: string;
  scope?: string;
  lastUsed?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const integrationSchema = new Schema(
  {
    type: { type: String, enum: ["SERVICE", "API_KEY"], required: true },
    
    // Services
    name: { type: String },
    category: { type: String },
    status: { type: String, enum: ["connected", "degraded", "off"] },
    detail: { type: String },
    
    // API Keys
    keyPrefix: { type: String },
    keyHash: { type: String },
    scope: { type: String },
    lastUsed: { type: Date },
  },
  { timestamps: true }
);

export const Integration = mongoose.model<IIntegration>("Integration", integrationSchema);
