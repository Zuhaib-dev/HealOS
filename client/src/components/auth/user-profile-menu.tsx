"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/use-auth-store";
import { fetchPatientProfileApi, PatientProfileData } from "@/lib/api/onboarding";
import {
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Stethoscope,
  Phone,
  Sun,
  Moon,
  CheckCircle2,
  Heart,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export function UserProfileMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();

  const [patientProfile, setPatientProfile] = useState<PatientProfileData | null>(null);

  useEffect(() => {
    if (!user) return;
    const checkPatientStatus = async () => {
      try {
        const res = await fetchPatientProfileApi();
        if (res.success && res.profile) {
          setPatientProfile(res.profile);
        }
      } catch {
        // Silent catch for optional status
      }
    };
    checkPatientStatus();
  }, [user]);

  if (!user) return null;

  const isPatientComplete = Boolean(patientProfile?.isComplete);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    if (role === "PATIENT" || role === "patient") {
      return "PATIENT";
    }
    if (role === "USER") {
      return isPatientComplete ? "PATIENT" : "NEW USER";
    }
    return role;
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "DOCTOR":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "RADIOLOGIST":
        return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
      case "patient":
      case "PATIENT":
      case "USER":
      default:
        return isPatientComplete
          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
          : "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getDashboardHref = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "/admin";
      case "DOCTOR":
        return "/doctor";
      case "RADIOLOGIST":
        return "/radiology";
      default:
        return "/patient";
    }
  };

  const handleLogout = async () => {
    logout();
    try {
      await signOut({ redirect: false });
    } catch {
      // Ignore if next-auth session is not active
    }
    toast.success("Signed out successfully");
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-2.5 rounded-full p-1 pr-3 border border-border/70 hover:border-primary/40 bg-card/60 hover:bg-muted/50 transition-all cursor-pointer outline-none"
          aria-label="Open user profile menu"
        >
          <Avatar className="size-8 border border-border/60">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-primary font-mono text-xs font-bold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="hidden sm:flex flex-col text-left leading-none">
            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {user.name.split(" ")[0]}
            </span>
            <span className="mono-label text-[10px] text-muted-foreground mt-0.5 uppercase">
              {getRoleLabel(user.role)}
            </span>
          </div>

          <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 border-border/70 plate p-2 shadow-xl rounded-xl mt-2"
        align="end"
        sideOffset={6}
      >
        {/* Header Profile Summary */}
        <div className="p-3 bg-muted/40 rounded-lg hairline mb-1">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border border-border">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary font-mono text-sm font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate text-foreground">
                  {user.name}
                </span>
                {user.isEmailVerified && (
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" title="Verified Account" />
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate font-mono">
                {user.email}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
            <span className="mono-label text-[10px] text-muted-foreground">
              Account Status
            </span>
            <Badge
              variant="outline"
              className={`mono-label text-[10px] px-2 py-0.5 font-bold uppercase ${getRoleBadgeStyle(
                user.role
              )}`}
            >
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Section 1: Navigation & Workspace */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href={getDashboardHref(user.role)}
              className="flex items-center gap-2.5 p-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted/60 transition-colors"
            >
              <LayoutDashboard className="size-4 text-primary" />
              <span>
                Go to {user.role === "USER" || user.role === "PATIENT" || user.role === "patient" ? "Patient Portal" : `${user.role} Console`}
              </span>
            </Link>
          </DropdownMenuItem>

          {/* Conditional Onboarding Prompts */}
          {!isPatientComplete ? (
            <DropdownMenuItem asChild>
              <Link
                href="/onboarding"
                className="flex items-center justify-between p-2 text-xs font-medium cursor-pointer rounded-md bg-rose-500/10 hover:bg-rose-500/15 transition-colors border border-rose-500/20 text-rose-600 dark:text-rose-400"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="size-4 text-rose-500 animate-pulse" />
                  <span className="font-semibold">Complete Patient Setup</span>
                </div>
                <Badge variant="outline" className="text-[9px] bg-rose-500/20 border-rose-500/30 px-1.5 py-0">
                  Action Required
                </Badge>
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link
                href="/onboarding"
                className="flex items-center gap-2.5 p-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted/60 transition-colors"
              >
                <FileText className="size-4 text-rose-500" />
                <span>My Patient Health Record</span>
              </Link>
            </DropdownMenuItem>
          )}

          {/* Show Clinician Application ONLY for standard users */}
          {(user.role === "USER" || user.role === "PATIENT" || user.role === "patient") && (
            <DropdownMenuItem asChild>
              <Link
                href="/onboarding"
                className="flex items-center gap-2.5 p-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted/60 transition-colors"
              >
                <Stethoscope className="size-4 text-emerald-500" />
                <span>Apply as Clinician / Doctor</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Section 2: Contact Info & Settings */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="flex items-center justify-between p-2 text-xs font-medium cursor-default rounded-md"
          >
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Phone className="size-4" />
              <span>Contact Phone</span>
            </div>
            <span className="font-mono text-[11px] text-foreground font-semibold">
              {user.phone || patientProfile?.emergencyPhone || "Not set"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-between p-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4 text-indigo-500" />
              )}
              <span>Theme Appearance</span>
            </div>
            <span className="mono-label text-[10px] text-muted-foreground uppercase">
              {theme}
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Section 3: Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2.5 p-2 text-xs font-medium text-destructive focus:text-destructive cursor-pointer rounded-md hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="size-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
