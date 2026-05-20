import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in ReachFront — latest updates, new features, and improvements to the ASO workspace.",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  return (
    <>
      <PublicNav />
      <main className="pt-20">
        <div className="max-w-3xl mx-auto px-8 py-24 lg:py-32">
          <h1 className="text-[36px] lg:text-[48px] font-semibold text-ink leading-[1.1] tracking-[-0.02em] mb-4">
            Changelog
          </h1>
          <p className="text-[17px] text-ink-muted leading-relaxed mb-12">
            What&apos;s new in ReachFront. We ship updates weekly.
          </p>

          <div className="space-y-10">
            <article className="border-l-2 border-ink/10 pl-6">
              <time className="text-[12px] font-bold uppercase tracking-[0.15em] text-ink-faint">May 2026</time>
              <h2 className="text-[20px] font-semibold text-ink mt-2 mb-3">Keyword-optimized generator</h2>
              <ul className="space-y-2 text-[15px] text-ink-muted leading-relaxed">
                <li>Single keyword-optimized variant — pick your target keyword, get a full listing built around it</li>
                <li>URL import — paste an App Store or Play Store link to auto-import your existing listing</li>
                <li>AI-powered keyword suggestions in the clarify step</li>
                <li>User-editable primary keyword in the Score Checker for more accurate audits</li>
                <li>Brand rename: Outreach is now ReachFront</li>
              </ul>
            </article>

            <article className="border-l-2 border-ink/10 pl-6">
              <time className="text-[12px] font-bold uppercase tracking-[0.15em] text-ink-faint">April 2026</time>
              <h2 className="text-[20px] font-semibold text-ink mt-2 mb-3">Six tools, one workspace</h2>
              <ul className="space-y-2 text-[15px] text-ink-muted leading-relaxed">
                <li>Competitor Watch — auto-discover and compare competing apps</li>
                <li>Keyword Research — live App Store and Play Store rankings</li>
                <li>Reddit Demand — validate your app idea against real Reddit threads</li>
                <li>Score Checker — free ASO audit with 20+ checks</li>
              </ul>
            </article>
          </div>

          <div className="mt-12 pt-6 border-t border-line-soft">
            <Link href="/" className="text-[13px] text-ink-muted hover:text-ink transition-colors">
              &larr; Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
