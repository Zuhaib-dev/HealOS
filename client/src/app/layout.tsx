import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import type { Metadata } from "next";
import { Work_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "HealOS — The Operating System for Modern Hospitals",
    template: "%s | HealOS",
  },
  description:
    "HealOS unifies patient records, clinician onboarding, radiology, scheduling and revenue analytics in one secure hospital management platform.",
  keywords: [
    "hospital management",
    "clinic management",
    "healthcare",
    "appointments",
    "patient portal",
    "doctor dashboard",
    "radiology",
    "HealOS",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${workSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthSessionBridge />
            {children}
            <AuthModal />
            <Toaster position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
