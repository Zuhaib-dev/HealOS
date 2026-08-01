"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMeApi } from "@/lib/api/auth";
import { useAuthStore, UserRole } from "@/store/use-auth-store";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, token, openAuthModal, setUser, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const allowedRoleKey = useMemo(() => allowedRoles?.join("|") ?? "", [allowedRoles]);
  const roles = useMemo(
    () => (allowedRoleKey ? (allowedRoleKey.split("|") as UserRole[]) : []),
    [allowedRoleKey],
  );
  const userId = user?.id;

  useEffect(() => {
    let isActive = true;

    const redirectForRole = (role: UserRole) => {
      switch (role) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "DOCTOR":
          router.push("/doctor");
          break;
        case "RADIOLOGIST":
          router.push("/radiology");
          break;
        case "patient":
        case "PATIENT":
        case "USER":
        default:
          router.push("/patient");
          break;
      }
    };

    const verifySession = async () => {
      if (!isAuthenticated || !userId || !token) {
        if (isActive) setIsChecking(false);
        openAuthModal("login");
        router.push("/");
        return;
      }

      setIsChecking(true);

      try {
        const response = await fetchMeApi();
        if (!response.success || !response.user) {
          throw new Error("Unable to verify session");
        }

        setUser(response.user);

        if (roles.length > 0 && !roles.includes(response.user.role)) {
          redirectForRole(response.user.role);
        }
      } catch {
        logout();
        openAuthModal("login");
        router.push("/");
      } finally {
        if (isActive) setIsChecking(false);
      }
    };

    verifySession();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, token, userId, roles, router, openAuthModal, setUser, logout]);

  if (isChecking || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="mono-label text-muted-foreground animate-pulse text-xs">
          Authenticating workspace credentials...
        </div>
      </div>
    );
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
