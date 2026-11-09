import { createPageMetadata } from "@/lib/seo/metadata";
import { Suspense } from "react";
import LoginClient from "./login-client";

export const metadata = createPageMetadata(
  "Sign In",
  "Sign In workspace in HealOS for hospital care and operations.",
  { noIndex: true },
);

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground mono-label animate-pulse">
          Loading secure workspace...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
