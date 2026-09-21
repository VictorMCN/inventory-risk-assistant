import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IRA — Inventory Risk Assistant",
    template: "%s | IRA",
  },

  description:
    "AI-powered inventory planning platform for stockout risk analysis, SKU prioritization, inventory health, and replenishment decision support.",

  applicationName: "IRA",

  keywords: [
    "inventory planning",
    "inventory risk",
    "stockout risk",
    "SKU prioritization",
    "replenishment",
    "inventory analytics",
    "AI inventory assistant",
  ],

  authors: [
    {
      name: "Victor Macene",
    },
  ],
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50">
        {children}
      </body>
    </html>
  );
}