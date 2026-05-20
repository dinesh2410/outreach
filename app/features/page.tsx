import type { Metadata } from "next";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { FeaturesContent } from "./FeaturesContent";

export const metadata: Metadata = {
  title: "Features — ASO Tools for App Makers",
  description:
    "Keyword-optimized description generator, free ASO score checker, Reddit demand validation, competitor analysis, and keyword research. All the tools you need after building your app.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <PublicNav />
      <FeaturesContent />
      <Footer />
    </>
  );
}
