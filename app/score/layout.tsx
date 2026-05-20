import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free ASO Score Checker — Audit Any App Store Listing",
  description:
    "Paste any App Store or Play Store URL and get a 0–100 ASO score with keyword placement checks and actionable fixes. Enter your own primary keyword for a sharper audit. Free, no sign-up required.",
  alternates: { canonical: "/score" },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
