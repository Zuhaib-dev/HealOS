import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";
import type { AuthUser } from "@/store/use-auth-store";

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    backendUser?: AuthUser;
    user: DefaultSession["user"] & {
      id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    googleId?: string;
    backendToken?: string;
    backendUser?: AuthUser;
  }
}
