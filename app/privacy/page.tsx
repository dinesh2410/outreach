import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ReachFront privacy policy — how we handle your data, what we collect, and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PublicNav />
      <main className="pt-20">
        <div className="max-w-3xl mx-auto px-8 py-24 lg:py-32">
          <h1 className="text-[36px] lg:text-[48px] font-semibold text-ink leading-[1.1] tracking-[-0.02em] mb-8">
            Privacy Policy
          </h1>
          <div className="prose prose-ink max-w-none text-[15px] leading-relaxed space-y-6">
            <p className="text-ink-muted">Last updated: May 2026</p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">What we collect</h2>
            <p className="text-ink-muted">
              When you create an account we store your name, email address, and authentication credentials.
              When you use our tools we store the inputs you provide (app names, URLs, descriptions) and the
              outputs we generate so you can access your history.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">How we use your data</h2>
            <p className="text-ink-muted">
              Your data is used to provide the service — generating descriptions, running audits, and saving
              your work. We do not sell your data. We do not use your generations to train AI models.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Third-party services</h2>
            <p className="text-ink-muted">
              We use Firebase (Google) for authentication and data storage, and Google Gemini for AI generation.
              Your inputs are sent to these services to provide functionality. Review their respective privacy
              policies for details on their data handling.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Your rights</h2>
            <p className="text-ink-muted">
              You can export or delete your data at any time from the Settings page. To request full account
              deletion, email us at{" "}
              <a href="mailto:hello@reachfront.app" className="text-ink font-medium hover:underline">
                hello@reachfront.app
              </a>.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Contact</h2>
            <p className="text-ink-muted">
              Questions about this policy? Reach us at{" "}
              <a href="mailto:hello@reachfront.app" className="text-ink font-medium hover:underline">
                hello@reachfront.app
              </a>.
            </p>
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
