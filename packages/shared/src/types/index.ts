// ============================================
// HealOS — Shared Type Definitions
// ============================================

// ---------------------------
// User Roles
// ---------------------------
export enum UserRole {
  PATIENT = "patient",
  DOCTOR = "doctor",
  NURSE = "nurse",
  LAB_TECH = "lab_tech",
  PHARMACIST = "pharmacist",
  RADIOLOGIST = "radiologist",
  BILLING_STAFF = "billing_staff",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

// ---------------------------
// Base Entity
// ---------------------------
export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------
// User
// ---------------------------
export interface IUser extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string;
}

// ---------------------------
// Appointment Status
// ---------------------------
export enum AppointmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

// ---------------------------
// Appointment
// ---------------------------
export interface IAppointment extends BaseEntity {
  patientId: string;
  doctorId: string;
  departmentId: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  type: "in_person" | "telemedicine";
  reason: string;
  notes?: string;
}

// ---------------------------
// Department
// ---------------------------
export interface IDepartment extends BaseEntity {
  name: string;
  description: string;
  headDoctorId?: string;
  isActive: boolean;
}

// ---------------------------
// API Response Wrapper
// ---------------------------
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------
// Pagination
// ---------------------------
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}
