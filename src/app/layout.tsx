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

export const metadata: Metadata = {
  title: {
    template: "%s — Graphy",
    default: "Graphy — Backend Engineering Knowledge Graph",
  },
  description:
    "Learn backend engineering through a connected knowledge graph. Explore concepts, prerequisites, multi-language examples.",
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

