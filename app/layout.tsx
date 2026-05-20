import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const SITE_URL = "https://reachfront.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ReachFront — The post-build platform for indie app makers",
    template: "%s | ReachFront",
  },
  description:
    "Generate keyword-optimized App Store and Play Store listings, audit your ASO score, validate demand on Reddit, analyze competitors, and research keywords. The post-build workspace for indie app makers.",
  keywords: [
    "ASO",
    "app store optimization",
    "store listing generator",
    "ASO score checker",
    "app store description generator",
    "play store optimization",
    "indie app maker tools",
    "keyword research app store",
    "competitor analysis mobile apps",
  ],
  authors: [{ name: "ReachFront" }],
  creator: "ReachFront",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "ReachFront",
    title: "ReachFront — The post-build platform for indie app makers",
    description:
      "Generate keyword-optimized store listings, audit your ASO score, and ship the listing your app deserves. Free to start.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReachFront — The post-build platform for indie app makers",
    description:
      "Generate keyword-optimized store listings, audit your ASO score, and ship the listing your app deserves.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
