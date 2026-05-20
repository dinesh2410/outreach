import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/landing/Hero";
import { TrustedBy } from "@/components/landing/TrustedBy";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { BentoTools } from "@/components/landing/BentoTools";
import { Capabilities } from "@/components/landing/Capabilities";
import { Stats } from "@/components/landing/Stats";
import { ScoreChecker } from "@/components/landing/ScoreChecker";
import { WhyUs } from "@/components/landing/WhyUs";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "ReachFront",
      url: "https://reachfront.app",
      description:
        "The post-build workspace for indie app makers. ASO description generator, score checker, competitor analysis, keyword research, and Reddit demand validation.",
    },
    {
      "@type": "WebApplication",
      name: "ReachFront",
      url: "https://reachfront.app",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free to start — no credit card required",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What are the two main tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The ASO Generator writes a keyword-optimized store description for your app — paste a URL or fill a brief, pick your target keyword, and get a publish-ready listing. The Screenshot Generator ships polished store screenshots with text overlays and localization. The ASO Generator is live today; the Screenshot Generator is shipping next.",
          },
        },
        {
          "@type": "Question",
          name: "What stores do the tools support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both — Apple App Store and Google Play. Character limits are enforced per platform (App Store has a 30-char subtitle and 4,000-char description; Play has an 80-char short description and 4,000-char full description) so what you copy is what the store accepts.",
          },
        },
        {
          "@type": "Question",
          name: "How does the keyword flow work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "After you enter your app details, we suggest relevant keywords based on your app and category. You pick the one you want to rank for, and the generator optimizes your entire listing around that keyword — title, short description, and full description.",
          },
        },
        {
          "@type": "Question",
          name: "Is the Score Checker free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes — paste any App Store or Play Store URL and get a 0–100 score against the ASO playbook with actionable fixes. You can also enter your own primary keyword for a more accurate audit. No sign-up required.",
          },
        },
        {
          "@type": "Question",
          name: "What other tools are available?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Beyond the two main tools, we have four live support tools: Score Checker (free ASO audit), Reddit Demand (validate your idea against real Reddit threads), Competitor Watch (side-by-side listing comparison), and Keyword Research (live rankings and difficulty scores).",
          },
        },
        {
          "@type": "Question",
          name: "Do I own the copy I generate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Everything you generate is yours to use, edit, ship, and re-license. We don't retain rights to your generations and we don't reuse them to train models.",
          },
        },
        {
          "@type": "Question",
          name: "Will the AI sound like a marketing intern?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Not if we can help it. We tuned the prompts against real indie-app listings and tested them with the maker community. The output is built to sound like a developer wrote it — no corporate-speak adjective stacks.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav />
      <main>
        <Hero />
        <TrustedBy />
        <FeatureShowcase />
        <Capabilities />
        <BentoTools />
        <WhyUs />
        <ScoreChecker />
        <Stats />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
