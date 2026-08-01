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
  const { isAuthenticated, user, token, openAuthModal, setUser, logout } = useAuthStore();
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
        (allowedNorm === "USER" || allowedNorm === "PATIENT") &&
        (normalized === "USER" || normalized === "PATIENT" || normalized === "LEGACY_PATIENT")
      ) {
        return true;
      }
      return false;
    });
  };

  useEffect(() => {
    let isActive = true;

    const redirectForRole = (role: string) => {
      const normalized = role.toUpperCase();
      let targetPath = "/patient";

      if (normalized === "ADMIN") {
        targetPath = "/admin";
      } else if (normalized === "DOCTOR") {
        targetPath = "/doctor";
      } else if (normalized === "RADIOLOGIST") {
        targetPath = "/radiology";
      }

      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    };

    const verifySession = async () => {
      if (!isAuthenticated || !userId || !token) {
        if (isActive) setIsChecking(false);
        openAuthModal("login");
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

        if (!isRoleAllowed(response.user.role, roles)) {
          redirectForRole(response.user.role);
        }
      } catch {
        logout();
        openAuthModal("login");
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
  }, [isAuthenticated, token, userId, allowedRoleKey, pathname, router, openAuthModal, setUser, logout]);

  if (isChecking || !isAuthenticated || !user) {
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
