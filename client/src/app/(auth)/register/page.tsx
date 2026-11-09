import { createPageMetadata } from "@/lib/seo/metadata";
import RegisterClient from "./register-client";

export const metadata = createPageMetadata(
  "Create Your Account",
  "Create Your Account workspace in HealOS for hospital care and operations.",
  { noIndex: true },
);

export default function RegisterPage() {
  return <RegisterClient />;
}
