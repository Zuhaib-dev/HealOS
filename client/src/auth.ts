import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { AuthUser } from "@/store/use-auth-store";

interface BackendAuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

const syncGoogleUserWithBackend = async (profile: {
  email?: string | null;
  name?: string | null;
  sub?: string | null;
  picture?: string | null;
}): Promise<BackendAuthResponse | null> => {
  if (!profile.email || !profile.sub) return null;

  const response = await fetch(`${API_BASE_URL}/auth/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sync-secret": process.env.AUTH_SYNC_SECRET || "",
    },
    body: JSON.stringify({
      email: profile.email,
      name: profile.name || profile.email,
      googleId: profile.sub,
      avatarUrl: profile.picture || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend Google auth sync failed with status ${response.status}`);
  }

  return response.json() as Promise<BackendAuthResponse>;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
  ],
  secret: process.env.AUTH_SECRET || "dev-secret-key-change-in-production",
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId = profile.sub ?? undefined;
        token.email = profile.email ?? undefined;
        token.name = profile.name ?? undefined;
        token.picture = profile.picture ?? undefined;

        try {
          const backendAuth = await syncGoogleUserWithBackend(profile);
          if (backendAuth?.success && backendAuth.token && backendAuth.user) {
            token.backendToken = backendAuth.token;
            token.backendUser = backendAuth.user;
          }
        } catch (error) {
          console.error("Failed to sync Google user with backend:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const backendUser = token.backendUser as AuthUser | undefined;
        session.user.id = backendUser?.id || (token.googleId as string);
        session.backendToken = token.backendToken as string | undefined;
        session.backendUser = backendUser;
      }
      return session;
    },
  },
});
