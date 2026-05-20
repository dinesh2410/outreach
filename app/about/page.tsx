import type { Metadata } from "next";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { AboutContent } from "./AboutContent";

export const metadata: Metadata = {
  title: "About ReachFront",
  description:
    "ReachFront is the post-build workspace for indie app makers. Learn about our mission to help developers ship better store listings.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PublicNav />
      <AboutContent />
      <Footer />
    </>
  );
}
