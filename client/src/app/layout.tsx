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
import { SoundProvider } from "@/components/sound-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": "https://healos-theta.vercel.app/#creator",
        "name": "Zuhaib Rashid",
        "url": "https://zuhaibrashid.com",
        "sameAs": [
          "https://github.com/Zuhaib-dev",
          "https://www.linkedin.com/in/zuhaib-rashid-661345318/",
          "https://x.com/xuhaib_x9"
        ]
      },
      {
        "@type": "Organization",
        "@id": "https://healos-theta.vercel.app/#organization",
        "name": "HealOS",
        "url": "https://healos-theta.vercel.app",
        "logo": "https://healos-theta.vercel.app/icon.svg",
        "founder": {
          "@id": "https://healos-theta.vercel.app/#creator"
        },
        "sameAs": [
          "https://github.com/Zuhaib-dev",
          "https://www.linkedin.com/in/zuhaib-rashid-661345318/",
          "https://x.com/xuhaib_x9"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://healos-theta.vercel.app/#website",
        "url": "https://healos-theta.vercel.app",
        "name": "HealOS",
        "description": "The Operating System for Modern Hospitals. Seamlessly unified patient records, revenue analytics, and clinician workflows.",
        "publisher": {
          "@id": "https://healos-theta.vercel.app/#organization"
        },
        "author": {
          "@id": "https://healos-theta.vercel.app/#creator"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://healos-theta.vercel.app/#softwareapplication",
        "name": "HealOS App",
        "operatingSystem": "All",
        "applicationCategory": "HealthApplication",
        "author": {
          "@id": "https://healos-theta.vercel.app/#creator"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }
    ]
  };

  return (
    <html
      lang="en"
      className={`${workSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="application-name" content="HealOS" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HealOS" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthSessionBridge />
            <SoundProvider />
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
