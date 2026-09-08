import type { Metadata } from "next";
import "./globals.css";

// Note: intentionally not using next/font/google here — this build
// environment blocks network access to Google Fonts. System fonts avoid an
// unnecessary build-time network dependency; swap in next/font later if
// you want a custom typeface.

export const metadata: Metadata = {
  title: "GymFlow — Gym Management System",
  description: "Manage members, plans, subscriptions, and payments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
