"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, UserRole } from "@/store/use-auth-store";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, openAuthModal } = useAuthStore();

  useEffect(() => {
    // If not authenticated, prompt login
    if (!isAuthenticated || !user) {
      openAuthModal("login");
      router.push("/");
      return;
    }

    // Role-based redirection if specified
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        switch (user.role) {
          case "ADMIN":
            router.push("/admin");
            break;
          case "DOCTOR":
            router.push("/doctor");
            break;
          case "RADIOLOGIST":
            router.push("/radiology");
            break;
          case "USER":
          default:
            router.push("/patient");
            break;
        }
      }
    }
  }, [isAuthenticated, user, allowedRoles, router, openAuthModal, pathname]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="mono-label text-muted-foreground animate-pulse text-xs">
          Authenticating workspace credentials...
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
