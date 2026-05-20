import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review Intelligence — AI-Powered Competitor Review Analysis",
  description:
    "Analyze competitor app reviews with AI. Extract themes, sentiment trends, feature requests, market gaps, and strategic opportunities from real user feedback.",
  alternates: { canonical: "/competitor/reviews" },
};

export default function ReviewIntelligenceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
