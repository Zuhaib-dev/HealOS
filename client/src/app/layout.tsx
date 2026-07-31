import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "HealOS — An Operating System for Healthcare",
    template: "%s | HealOS",
  },
  description:
    "HealOS is a production-ready Hospital Management System for hospitals, clinics, and multi-specialty centers. Manage appointments, patients, doctors, billing, and more.",
  keywords: [
    "hospital management",
    "clinic management",
    "healthcare",
    "appointments",
    "patient portal",
    "doctor dashboard",
    "HealOS",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
