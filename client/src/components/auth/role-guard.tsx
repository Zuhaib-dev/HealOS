"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchMeApi } from "@/lib/api/auth";
import { useAuthStore, UserRole } from "@/store/use-auth-store";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, token, _hasHydrated, openAuthModal, setUser, logout } =
    useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  const allowedRoleKey = useMemo(() => allowedRoles?.join("|") ?? "", [allowedRoles]);
  const roles = useMemo(
    () => (allowedRoleKey ? (allowedRoleKey.split("|") as UserRole[]) : []),
    [allowedRoleKey],
  );

  const userId = user?.id;

  const isRoleAllowed = (role: string, targetRoles: UserRole[]): boolean => {
    if (targetRoles.length === 0) return true;
    const normalized = role.toUpperCase();

    return targetRoles.some((allowed) => {
      const allowedNorm = allowed.toUpperCase();
      if (allowedNorm === normalized) return true;
      if (
        allowedNorm === "PATIENT" &&
        (normalized === "PATIENT" || normalized === "LEGACY_PATIENT")
      ) {
        return true;
      }
      return false;
    });
  };

  useEffect(() => {
    // Wait until Zustand state has hydrated from localStorage
    if (!_hasHydrated) return;

    let isActive = true;

    const redirectForRole = (role: string) => {
      const normalized = role.toUpperCase();
      let targetPath = "/";

      if (normalized === "ADMIN") {
        targetPath = "/admin";
      } else if (normalized === "DOCTOR") {
        targetPath = "/doctor";
      } else if (normalized === "RADIOLOGIST") {
        targetPath = "/radiology";
      } else if (normalized === "RECEPTIONIST") {
        targetPath = "/reception";
      } else if (normalized === "PHARMACIST") {
        targetPath = "/pharmacy";
      } else if (normalized === "NURSE") {
        targetPath = "/nurse";
      } else if (normalized === "EMERGENCY_DOCTOR") {
        targetPath = "/emergency";
      } else if (normalized === "LAB_TECHNICIAN") {
        targetPath = "/lab";
      } else if (normalized === "PATIENT" || normalized === "LEGACY_PATIENT") {
        targetPath = "/patient";
      } else if (normalized === "USER") {
        targetPath = "/";
      }

      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    };

    const verifySession = async () => {
      // 1. Unauthenticated case
      if (!token) {
        if (isActive) setIsChecking(false);
        if (pathname !== "/") {
          router.push("/");
        }
        return;
      }

      setIsChecking(true);

      try {
        const response = await fetchMeApi();
        if (!response.success || !response.user) {
          throw new Error("Unable to verify session");
        }

        setUser(response.user);

        // 2. Check Role permissions
        if (!isRoleAllowed(response.user.role, roles)) {
          // Authorized user visiting wrong portal -> Redirect cleanly without opening auth modal!
          redirectForRole(response.user.role);
        }
      } catch {
        // Only log out if token verification actually failed
        logout();
        if (pathname !== "/") {
          router.push("/");
        }
      } finally {
        if (isActive) setIsChecking(false);
      }
    };

    verifySession();

    return () => {
      isActive = false;
    };
  }, [
    _hasHydrated,
    isAuthenticated,
    token,
    userId,
    allowedRoleKey,
    pathname,
    router,
    openAuthModal,
    setUser,
    logout,
  ]);

  if (!_hasHydrated || isChecking || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="mono-label text-muted-foreground animate-pulse text-xs">
          Authenticating workspace credentials...
        </div>
      </div>
    );
  }

  if (!isRoleAllowed(user.role, roles)) {
    return null;
  }

  return <>{children}</>;
}
