import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Competitor Analysis — Compare App Store Listings Side by Side",
  description:
    "Auto-discover apps competing for your keyword. Compare ratings, review volume, keyword usage, and listing quality in one side-by-side dashboard.",
  alternates: { canonical: "/competitor" },
};

export default function CompetitorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
