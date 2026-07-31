// ============================================
// HealOS Server — MongoDB Connection
// ============================================
import mongoose from "mongoose";
import { envConfig } from "./env.js";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(envConfig.MONGODB_URI, {
      // Connection pool settings for production readiness
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting reconnection...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected gracefully");
};
