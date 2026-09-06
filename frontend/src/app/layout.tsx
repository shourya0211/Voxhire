import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Sora } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "VoxHire",
  description: "Voice-first hiring, reachout, and attendance workflows powered by Hunar Voice Agents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
