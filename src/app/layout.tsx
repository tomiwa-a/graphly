import type { Metadata } from "next";
import { Fredoka, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { BodyLayout } from "@/components/layout/body-layout";
import { EntranceCurtain } from "@/components/entrance-curtain";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s — Graphly",
    default: "Graphly — Backend Engineering Knowledge Graph",
  },
  description:
    "Learn backend engineering through a connected knowledge graph. Explore concepts, prerequisites, multi-language examples.",
  openGraph: {
    title: "Graphly — Backend Engineering Knowledge Graph",
    description:
      "Learn backend engineering through a connected knowledge graph. Explore concepts, prerequisites, multi-language examples.",
    url: SITE_URL,
    siteName: "Graphly",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${plusJakartaSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased bg-surface text-foreground font-sans">
        <EntranceCurtain />
        <BodyLayout>{children}</BodyLayout>
      </body>
    </html>
  );
}

