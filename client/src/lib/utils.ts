// ============================================
// HealOS Client — Utility: cn() class merger
// ============================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge.
 * Prevents class conflicts (e.g., p-2 + p-4 → p-4).
 *
 * Usage: cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
