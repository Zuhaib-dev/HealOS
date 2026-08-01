// ============================================
// HealOS Server — Environment Configuration
// ============================================
import dotenv from "dotenv";
import path from "path";

// Force load .env from current dir and root dir
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import { z } from "zod";

const DEFAULT_MONGO_ATLAS = "mongodb+srv://***REMOVED_MONGO_URI***/healos?retryWrites=true&w=majority";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5001),
  CLIENT_URL: z.string().default("http://localhost:3000"),

  // MongoDB (Defaults to Online Atlas Cluster)
  MONGODB_URI: z.string().default(DEFAULT_MONGO_ATLAS),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // JWT
  JWT_SECRET: z.string().default("dev-jwt-secret-change-in-production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-in-production"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default("***REMOVED_SMTP_USER***"),
  SMTP_PASS: z.string().default("***REMOVED_SMTP_PASS***"),
  EMAIL_FROM: z.string().default("HealOS <noreply@healos.com>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const envConfig = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
