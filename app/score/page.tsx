import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { ScoreChecker } from "@/components/landing/ScoreChecker";

export default function ScorePage() {
  return (
    <>
      <PublicNav />
      <main>
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 text-center animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-semibold text-ink">
              ASO Score Checker
            </h1>
            <p className="mt-6 text-lg text-ink-muted max-w-2xl mx-auto">
              Paste your app store URL and get an instant audit with a 0-100
              score and actionable fixes. Free, no sign-up required.
            </p>
          </div>
        </section>
        <ScoreChecker standalone />
        <div className="pb-24" />
      </main>
      <Footer />
    </>
  );
}
