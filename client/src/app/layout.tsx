import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
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
  metadataBase: new URL("https://healos-theta.vercel.app"),
  title: {
    default: "HealOS | Modern Healthcare Management",
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
  authors: [{ name: "Zuhaib Rashid", url: "https://zuhiabrashid.com" }],
  creator: "Zuhaib Rashid",
  publisher: "Zuhaib Rashid",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "HealOS | Modern Healthcare Management",
    description: "The Operating System for Modern Hospitals. Seamlessly unified patient records, revenue analytics, and clinician workflows.",
    url: "https://healos-theta.vercel.app",
    siteName: "HealOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HealOS | Modern Healthcare Management",
    description: "The Operating System for Modern Hospitals.",
    creator: "@zuhiabrashid", // Optional, adjust if different handle
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  verification: {
    google: "terZRkP5xAisMxUTVWZ_rW6MXSuOeuAFITryD0CBDxA",
  },
};

import { RealtimeSocketProvider } from "@/components/providers/socket-provider";

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
            <RealtimeSocketProvider>
              {children}
            </RealtimeSocketProvider>
            <Toaster position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
