import { Metadata } from "next";
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
  return <LoginClient />;
}
