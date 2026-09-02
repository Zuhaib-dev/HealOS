// ============================================
// HealOS Client — Auth Navigation & Safe Redirects
// ============================================

/**
 * Returns the canonical dashboard/panel path for a given user role.
 */
export function getRoleDashboardPath(role?: string | null): string {
  if (!role) return "/";
  const normalized = role.toUpperCase();

  switch (normalized) {
    case "ADMIN":
      return "/admin";
    case "DOCTOR":
      return "/doctor";
    case "RADIOLOGIST":
      return "/radiology";
    case "RECEPTIONIST":
      return "/reception";
    case "PHARMACIST":
      return "/pharmacy";
    case "NURSE":
      return "/nurse";
    case "EMERGENCY_DOCTOR":
      return "/emergency";
    case "LAB_TECHNICIAN":
      return "/lab";
    case "PATIENT":
    case "LEGACY_PATIENT":
    case "USER":
      return "/patient";
    default:
      return "/";
  }
}

/**
 * Returns human-friendly workspace title for a given user role.
 */
export function getRoleDisplayName(role?: string | null): string {
  if (!role) return "Workspace";
  const normalized = role.toUpperCase();

  switch (normalized) {
    case "ADMIN":
      return "Admin Console";
    case "DOCTOR":
      return "Doctor Workspace";
    case "RADIOLOGIST":
      return "Radiology Suite";
    case "RECEPTIONIST":
      return "Reception Desk";
    case "PHARMACIST":
      return "Pharmacy Console";
    case "NURSE":
      return "Nursing Station";
    case "EMERGENCY_DOCTOR":
      return "Emergency Department";
    case "LAB_TECHNICIAN":
      return "Laboratory System";
    case "PATIENT":
    case "LEGACY_PATIENT":
    case "USER":
      return "Patient Portal";
    default:
      return "Clinical Workspace";
  }
}

/**
 * Checks whether a callbackUrl is safe to redirect to.
 * Prevents open-redirect attacks and redirect loops to auth pages.
 */
export function isValidCallbackUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;

  // Must start with '/' but not '//' or '/\'
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) {
    return false;
  }

  // Prevent redirect loops to login/register
  const cleanPath = url.split("?")[0].toLowerCase();
  if (cleanPath === "/login" || cleanPath === "/register") {
    return false;
  }

  return true;
}

/**
 * Resolves a safe redirect destination, prioritizing a valid callbackUrl
 * and falling back to the user's role-specific panel.
 */
export function getSafeRedirectPath(
  role?: string | null,
  callbackUrl?: string | null,
): string {
  if (callbackUrl && isValidCallbackUrl(callbackUrl)) {
    return callbackUrl;
  }
  return getRoleDashboardPath(role);
}
