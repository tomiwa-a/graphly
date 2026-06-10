import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BodyLayout } from "@/components/layout/body-layout";
import { EntranceCurtain } from "@/components/entrance-curtain";
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <EntranceCurtain />
        <BodyLayout>{children}</BodyLayout>
      </body>
    </html>
  );
}
