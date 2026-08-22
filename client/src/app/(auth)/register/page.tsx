import { Metadata } from "next";
import RegisterClient from "./register-client";

export const metadata: Metadata = {
  title: "Create Account | HealOS",
  description: "Join HealOS, the unified healthcare operating system for your clinic or hospital.",
  alternates: {
    canonical: "https://healos-theta.vercel.app/register",
  },
  openGraph: {
    title: "Create Account | HealOS",
    description: "Join HealOS, the unified healthcare operating system for your clinic or hospital.",
    url: "https://healos-theta.vercel.app/register",
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
