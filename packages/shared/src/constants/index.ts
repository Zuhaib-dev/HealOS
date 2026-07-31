// ============================================
// HealOS — Shared Constants
// ============================================

export const APP_NAME = "HealOS" as const;
export const APP_TAGLINE = "An Operating System for Healthcare" as const;
export const APP_VERSION = "1.0.0" as const;

// ---------------------------
// API
// ---------------------------
export const API_PREFIX = "/api/v1" as const;

// ---------------------------
// Pagination Defaults
// ---------------------------
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

// ---------------------------
// Auth
// ---------------------------
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;

// ---------------------------
// Appointment
// ---------------------------
export const APPOINTMENT_SLOT_DURATION_MINUTES = 15;
export const MAX_ADVANCE_BOOKING_DAYS = 30;
export const CANCELLATION_WINDOW_HOURS = 2;

// ---------------------------
// File Upload
// ---------------------------
export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

// ---------------------------
// Rate Limiting
// ---------------------------
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

// ---------------------------
// Departments (Seed Data)
// ---------------------------
export const DEFAULT_DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "ENT",
  "Gastroenterology",
  "Gynecology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Urology",
] as const;
