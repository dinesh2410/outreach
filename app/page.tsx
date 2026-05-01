import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/landing/Hero";
import { TrustedBy } from "@/components/landing/TrustedBy";
import { Showcase } from "@/components/landing/Showcase";
import { BentoTools } from "@/components/landing/BentoTools";
import { Capabilities } from "@/components/landing/Capabilities";
import { Stats } from "@/components/landing/Stats";
import { ScoreChecker } from "@/components/landing/ScoreChecker";
import { WhyUs } from "@/components/landing/WhyUs";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <>
      <PublicNav />
      <main>
        <Hero />
        <TrustedBy />
        <Showcase />
        <BentoTools />
        <Capabilities />
        <Stats />
        <ScoreChecker />
        <WhyUs />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
