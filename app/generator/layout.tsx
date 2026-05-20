import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ASO Description Generator — Keyword-Optimized Store Listings",
  description:
    "Generate keyword-optimized App Store and Play Store descriptions. Paste a URL or fill a brief, pick your target keyword, and get a publish-ready listing in under a minute.",
  alternates: { canonical: "/generator" },
};

export default function GeneratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
