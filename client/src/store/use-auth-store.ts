import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole =
  | "PATIENT"
  | "patient"
  | "USER"
  | "ADMIN"
  | "DOCTOR"
  | "RADIOLOGIST"
  | "RECEPTIONIST"
  | "PHARMACIST"
  | "NURSE"
  | "EMERGENCY_DOCTOR"
  | "LAB_TECHNICIAN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  isEmailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  
  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser) => void;
  updateUser: (partialUser: Partial<AuthUser>) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

const syncAuthCookies = (role?: string | null, hasToken: boolean = false) => {
  if (typeof document === "undefined") return;
  try {
    if (role && hasToken) {
      document.cookie = `healos_role=${encodeURIComponent(role)}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `healos_token=1; path=/; max-age=604800; SameSite=Lax`;
    } else {
      document.cookie = "healos_role=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "healos_token=; path=/; max-age=0; SameSite=Lax";
    }
  } catch {
    // Ignore cookie write errors
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) => {
        syncAuthCookies(user.role, Boolean(token));
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      setUser: (user) => {
        set((state) => {
          syncAuthCookies(user.role, Boolean(state.token));
          return { user };
        });
      },

      updateUser: (partialUser) =>
        set((state) => {
          const updatedUser = state.user ? { ...state.user, ...partialUser } : null;
          if (updatedUser) {
            syncAuthCookies(updatedUser.role, Boolean(state.token));
          }
          return { user: updatedUser };
        }),

      setToken: (token) => set({ token }),

      logout: () => {
        syncAuthCookies(null, false);
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("healos-auth-storage");
          } catch {
            // Ignore storage errors
          }
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
    }),
    {
      name: "healos-auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.isAuthenticated && state?.user?.role && state?.token) {
          syncAuthCookies(state.user.role, true);
        } else if (!state?.isAuthenticated) {
          syncAuthCookies(null, false);
        }
      },
    }
  )
);

