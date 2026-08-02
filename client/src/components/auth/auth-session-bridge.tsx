"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/use-auth-store";
import type { AuthUser } from "@/store/use-auth-store";

type BackendSession = {
  backendToken?: string;
  backendUser?: AuthUser;
};

export function AuthSessionBridge() {
  const { data: session, status } = useSession();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const backendSession = session as BackendSession | null;

    if (
      status === "authenticated" &&
      backendSession?.backendToken &&
      backendSession.backendUser
    ) {
      const storeToken = useAuthStore.getState().token;
      if (!storeToken) {
        setAuth(backendSession.backendUser, backendSession.backendToken);
      }
    }
  }, [session, status, setAuth]);

  return null;
}
