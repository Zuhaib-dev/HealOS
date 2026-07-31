// ============================================
// HealOS Client — TypeScript Type Definitions
// ============================================
// Re-export shared types and add client-specific types

// Re-export everything from the shared package
export type * from "@healos/shared";

// ---------------------------
// Client-specific types
// ---------------------------

// Navigation
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
}

// Dashboard stat card
export interface StatCardData {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: string;
}

// Table column definition
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}
