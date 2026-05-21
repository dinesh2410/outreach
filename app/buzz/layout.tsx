import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buzz Tracker — Monitor Brand Mentions on Reddit",
  description:
    "Track when your brand, app, or keyword gets mentioned on Reddit. Get notified of new mentions automatically with hourly checks.",
  alternates: { canonical: "/buzz" },
};

export default function BuzzLayout({ children }: { children: React.ReactNode }) {
  return children;
}
