import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reddit Demand Checker — Validate Your App Idea",
  description:
    "Check if people on Reddit are already asking for your app idea. Surface real posts, complaints, and feature requests that prove demand before you build.",
  alternates: { canonical: "/reddit" },
};

export default function RedditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
