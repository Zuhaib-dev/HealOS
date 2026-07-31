// ============================================
// HealOS Server — Environment Configuration
// ============================================
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default("http://localhost:3000"),

  // MongoDB
  MONGODB_URI: z.string().default("mongodb://localhost:27017/healos"),

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
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const envConfig = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
