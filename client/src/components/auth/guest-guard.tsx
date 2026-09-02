"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { getSafeRedirectPath, getRoleDisplayName } from "@/lib/auth-navigation";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, LogOut, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

interface GuestGuardProps {
  children: React.ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const isSwitchRequested =
    searchParams.get("switch") === "true" || searchParams.get("logout") === "true";

  const { isAuthenticated, user, token, _hasHydrated, logout } = useAuthStore();
  const [countdown, setCountdown] = useState(2);
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // If ?switch=true was passed in the URL, automatically logout to allow clean new sign-in
  useEffect(() => {
    if (_hasHydrated && isSwitchRequested && isAuthenticated) {
      logout();
      try {
        signOut({ redirect: false });
      } catch {
        // Ignore next-auth errors
      }
    }
  }, [_hasHydrated, isSwitchRequested, isAuthenticated, logout]);

  const targetPath = getSafeRedirectPath(user?.role, callbackUrl);
  const workspaceTitle = getRoleDisplayName(user?.role);

  // Auto-redirect countdown when authenticated
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !user || !token || isSwitchRequested) {
      return;
    }

    if (countdown <= 0) {
      startTransition(() => {
        router.replace(targetPath);
      });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    _hasHydrated,
    isAuthenticated,
    user,
    token,
    isSwitchRequested,
    countdown,
    targetPath,
    router,
  ]);

  const handleManualRedirect = () => {
    startTransition(() => {
      router.replace(targetPath);
    });
  };

  const handleSwitchAccount = async () => {
    setIsSigningOut(true);
    try {
      logout();
      await signOut({ redirect: false });
      toast.success("Signed out successfully. You may sign in with a different account.");
    } catch {
      toast.success("Signed out successfully.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "DOCTOR":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "RADIOLOGIST":
        return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
      case "RECEPTIONIST":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "PHARMACIST":
        return "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30";
      case "NURSE":
        return "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30";
      case "EMERGENCY_DOCTOR":
        return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
      case "LAB_TECHNICIAN":
        return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
      case "PATIENT":
      case "LEGACY_PATIENT":
      case "USER":
      default:
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
    }
  };

  // 1. Initial hydration state: clean subtle loading placeholder
  if (!_hasHydrated) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 space-y-4">
        <div className="size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <RefreshCw className="size-5 text-emerald-500 animate-spin" />
        </div>
        <p className="mono-label text-xs text-muted-foreground animate-pulse">
          Validating workspace credentials...
        </p>
      </div>
    );
  }

  // 2. Already authenticated user detected on guest page
  if (isAuthenticated && user && token && !isSwitchRequested) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full space-y-6"
      >
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono mb-3">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Session Detected
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
            Already Signed In
          </h1>
          <p className="mono-label mt-1.5 text-xs text-muted-foreground">
            You are currently logged in to HealOS. Redirecting you to your workspace.
          </p>
        </div>

        {/* User Card */}
        <div className="p-4 rounded-xl border border-border/70 bg-card/70 backdrop-blur-xs space-y-4">
          <div className="flex items-center gap-3.5">
            <Avatar className="size-12 border border-border/80">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-primary font-mono text-sm font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate text-foreground">
                  {user.name}
                </span>
                {user.isEmailVerified && (
                  <ShieldCheck
                    className="size-3.5 text-emerald-500 shrink-0"
                    title="Verified Account"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                {user.email}
              </p>
            </div>

            <Badge
              variant="outline"
              className={`mono-label text-[10px] px-2 py-0.5 font-bold uppercase shrink-0 ${getRoleBadgeStyle(
                user.role,
              )}`}
            >
              {user.role}
            </Badge>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Destination</span>
            <span className="font-semibold text-foreground">{workspaceTitle}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          <Button
            type="button"
            onClick={handleManualRedirect}
            disabled={isPending}
            className="bg-primary text-primary-foreground mono-label w-full py-6 rounded-xl text-xs font-semibold shadow-md transition-all hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Navigating to {workspaceTitle}...</span>
              </>
            ) : (
              <>
                <span>
                  Continue to {workspaceTitle}
                  {countdown > 0 ? ` (${countdown}s)` : ""}
                </span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isSigningOut || isPending}
            onClick={handleSwitchAccount}
            className="w-full py-5 rounded-xl border-border/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 mono-label text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSigningOut ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <LogOut className="size-3.5" />
            )}
            <span>Sign out & switch account</span>
          </Button>
        </div>
      </motion.div>
    );
  }

  // 3. Guest user: render auth form as normal
  return <>{children}</>;
}
