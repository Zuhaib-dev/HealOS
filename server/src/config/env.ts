// ============================================
// HealOS Server — Environment Configuration
// ============================================
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const cwd = process.cwd();
const serverRoot = path.basename(cwd) === "server" ? cwd : path.join(cwd, "server");
const repoRoot = fs.existsSync(path.join(serverRoot, "package.json")) ? path.dirname(serverRoot) : cwd;
const originalEnvKeys = new Set(Object.keys(process.env));

dotenv.config({ path: path.join(repoRoot, ".env") });

const serverEnv = dotenv.config({ path: path.join(serverRoot, ".env") });
if (serverEnv.parsed) {
  for (const [key, value] of Object.entries(serverEnv.parsed)) {
    if (!originalEnvKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

import { z } from "zod";

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/healos";
const DEV_JWT_SECRET = "dev-jwt-secret-change-in-production";
const DEV_REFRESH_SECRET = "dev-refresh-secret-change-in-production";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(5001),
    CLIENT_URL: z.string().default("http://localhost:3000"),

    // MongoDB
    MONGODB_URI: z.string().default(DEFAULT_MONGO_URI),

    // Redis
    REDIS_URL: z.string().default("redis://localhost:6379"),

    // JWT
    JWT_SECRET: z.string().default(DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default("7d"),
    JWT_REFRESH_SECRET: z.string().default(DEV_REFRESH_SECRET),
    JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

    // Server-to-server auth
    AUTH_SYNC_SECRET: z.string().optional(),

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
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default("HealOS <noreply@healos.com>"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;

    if (env.JWT_SECRET === DEV_JWT_SECRET || env.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be set to a strong production secret.",
      });
    }

    if (env.JWT_REFRESH_SECRET === DEV_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must be set to a strong production secret.",
      });
    }

    if (!env.AUTH_SYNC_SECRET || env.AUTH_SYNC_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_SYNC_SECRET"],
        message: "AUTH_SYNC_SECRET must be set for production Google auth sync.",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const envConfig = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
