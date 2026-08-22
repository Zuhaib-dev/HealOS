import { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Sign In | HealOS",
  description: "Sign in to your HealOS clinical workspace or patient portal.",
  alternates: {
    canonical: "https://healos-theta.vercel.app/login",
  },
  openGraph: {
    title: "Sign In | HealOS",
    description: "Sign in to your HealOS clinical workspace or patient portal.",
    url: "https://healos-theta.vercel.app/login",
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground mono-label animate-pulse">Loading secure workspace...</div>}>
      <LoginClient />
    </Suspense>
  );
}
