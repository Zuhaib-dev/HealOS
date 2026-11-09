import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { CommandMenu } from "@/components/command-menu";
import type { Metadata, Viewport } from "next";
import { Work_Sans, JetBrains_Mono } from "next/font/google";
import { HEALOS_SITE_URL } from "@/lib/seo/metadata";
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
  metadataBase: new URL(HEALOS_SITE_URL),
  title: {
    default: "HealOS — Hospital Operations and Patient Care",
    template: "%s | HealOS",
  },
  description:
    "HealOS brings patient access, appointments, clinical workspaces, diagnostics, pharmacy, billing, and emergency department operations into one hospital platform.",
  applicationName: "HealOS",
  category: "Health",
  keywords: [
    "hospital operations software",
    "hospital management system",
    "patient portal",
    "clinical workflow software",
    "emergency department workflow",
    "laboratory information system",
    "radiology workflow",
    "pharmacy management",
    "HealOS",
  ],
  authors: [{ name: "Zuhaib Rashid", url: "https://zuhaibrashid.com/" }],
  creator: "Zuhaib Rashid",
  publisher: "Zuhaib Rashid",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "HealOS — Hospital Operations and Patient Care",
    description:
      "A connected platform for patient access, clinical teams, diagnostics, pharmacy, billing, and emergency workflows.",
    url: HEALOS_SITE_URL,
    siteName: "HealOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HealOS — Hospital Operations and Patient Care",
    description:
      "A connected platform for patient access, clinical teams, diagnostics, pharmacy, billing, and emergency workflows.",
    creator: "@xuhaib_x9",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#10b981",
};

import { RealtimeSocketProvider } from "@/components/providers/socket-provider";
import { SoundProvider } from "@/components/sound-provider";
import { WebMcpProvider } from "@/components/providers/webmcp-provider";
import { RouteProgress } from "@/components/navigation/route-progress";

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
        name: "Zuhaib Rashid",
        jobTitle: "Full Stack Developer & Healthcare Systems Architect",
        description:
          "Full Stack Developer and Healthcare Systems Architect building HealOS.",
        url: "https://zuhaibrashid.com/",
        sameAs: [
          "https://github.com/Zuhaib-dev",
          "https://www.linkedin.com/in/zuhaib-rashid-661345318/",
          "https://x.com/xuhaib_x9",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://healos-theta.vercel.app/#website",
        url: "https://healos-theta.vercel.app/",
        name: "HealOS",
        description:
          "Hospital operations and patient care software for connected clinical and administrative workflows.",
        inLanguage: "en",
        author: { "@id": "https://healos-theta.vercel.app/#creator" },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://healos-theta.vercel.app/#softwareapplication",
        name: "HealOS",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        url: "https://healos-theta.vercel.app/",
        description:
          "A hospital operations platform with patient access, clinical workspaces, diagnostics, pharmacy, billing, and emergency department workflows.",
        author: { "@id": "https://healos-theta.vercel.app/#creator" },
        featureList: [
          "Patient appointment and records portal",
          "Role-based doctor, nurse, reception, and administration workspaces",
          "Laboratory and radiology order workflows",
          "Emergency department triage and case records",
          "Pharmacy prescription and dispensing workflows",
        ],
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${workSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="alternate"
          type="text/markdown"
          href="https://healos-theta.vercel.app/index.md"
          title="Markdown representation"
        />
        <link
          rel="preconnect"
          href="https://ik.imagekit.io"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link
          rel="preconnect"
          href="https://lh3.googleusercontent.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          id="webmcp-registration"
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof window!=='undefined'){var mc={version:"1.0",tools:[{name:"search_clinical_records",description:"Search patient directory, clinical records, and bed occupancy",parameters:{type:"object",properties:{query:{type:"string",description:"Search query for patient or record"}},required:["query"]}},{name:"book_appointment",description:"Schedule a patient appointment with a physician",parameters:{type:"object",properties:{department:{type:"string"},dateTime:{type:"string",format:"date-time"}},required:["department","dateTime"]}},{name:"triage_patient",description:"Evaluate incoming emergency patient by Emergency Severity Index (ESI 1-5)",parameters:{type:"object",properties:{chief_complaint:{type:"string"},vital_signs:{type:"object"}},required:["chief_complaint"]}}]};window.modelContext=mc;if(typeof navigator!=='undefined'){try{navigator.modelContext=mc;}catch(e){}}}})();`,
          }}
        />
        <meta name="application-name" content="HealOS" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
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
            <WebMcpProvider />
            <RealtimeSocketProvider>{children}</RealtimeSocketProvider>
            <RouteProgress />
            <Toaster position="top-right" />
            <CommandMenu />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
