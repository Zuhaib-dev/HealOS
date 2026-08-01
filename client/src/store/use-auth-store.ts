import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "USER" | "ADMIN" | "DOCTOR" | "RADIOLOGIST" | "RECEPTIONIST";

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
  
  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
  logout: () => void;
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthModalOpen: false,
      authModalTab: "login",

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isAuthModalOpen: false,
        }),

      setUser: (user) => set({ user }),

      setToken: (token) => set({ token }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      openAuthModal: (tab = "login") =>
        set({
          isAuthModalOpen: true,
          authModalTab: tab,
        }),

      closeAuthModal: () => set({ isAuthModalOpen: false }),
    }),
    {
      name: "healos-auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
