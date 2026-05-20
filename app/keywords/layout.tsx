import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keyword Rank Checker — Live App Store & Play Store Rankings",
  description:
    "Check live App Store and Play Store search rankings for any keyword. See difficulty scores, top-ranking apps, and country-specific results in seconds.",
  alternates: { canonical: "/keywords" },
};

export default function KeywordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
