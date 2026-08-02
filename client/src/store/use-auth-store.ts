import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole =
  | "PATIENT"
  | "patient"
  | "USER"
  | "ADMIN"
  | "DOCTOR"
  | "RADIOLOGIST"
  | "RECEPTIONIST";

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
  isAuthModalOpen: boolean;
  authModalTab: "login" | "register";
  _hasHydrated: boolean;
  
  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser) => void;
  updateUser: (partialUser: Partial<AuthUser>) => void;
  setToken: (token: string) => void;
  logout: () => void;
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthModalOpen: false,
      authModalTab: "login",
      _hasHydrated: false,

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isAuthModalOpen: false,
        }),

      setUser: (user) => set({ user }),

      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        })),

      setToken: (token) => set({ token }),

      logout: () => {
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

      openAuthModal: (tab = "login") =>
        set({
          isAuthModalOpen: true,
          authModalTab: tab,
        }),

      closeAuthModal: () => set({ isAuthModalOpen: false }),

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
      },
    }
  )
);
