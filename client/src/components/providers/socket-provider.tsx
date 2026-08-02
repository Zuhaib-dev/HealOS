"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useAuthStore, UserRole } from "@/store/use-auth-store";
import { toast } from "sonner";

export function RealtimeSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();

    // Join user and role rooms
    socket.emit("join:user", user.id);
    socket.emit("join:role", user.role);

    // Listen for realtime role updates (e.g. when Admin approves Doctor role or Patient completes onboarding)
    const handleRoleUpdate = (data: { userId: string; newRole: UserRole }) => {
      if (data.userId === user.id && data.newRole !== user.role) {
        updateUser({ role: data.newRole });
        toast.success(`⚡ Your account role has been updated in real-time to ${data.newRole}!`, {
          duration: 6000,
        });
      }
    };

    socket.on("user:role_updated", handleRoleUpdate);

    return () => {
      socket.off("user:role_updated", handleRoleUpdate);
    };
  }, [user?.id, user?.role, isAuthenticated, updateUser]);

  return <>{children}</>;
}
