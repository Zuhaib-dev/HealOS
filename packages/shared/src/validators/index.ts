// ============================================
// HealOS — Shared Validation Schemas (Zod)
// ============================================
import { z } from "zod";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "../constants/index.js";

// ---------------------------
// Auth Validators
// ---------------------------
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number");

// ---------------------------
// Pagination Validator
// ---------------------------
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});

// ---------------------------
// MongoDB ObjectId Validator
// ---------------------------
export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ID format");

// ---------------------------
// Inferred Types
// ---------------------------
export type PaginationInput = z.infer<typeof paginationSchema>;
