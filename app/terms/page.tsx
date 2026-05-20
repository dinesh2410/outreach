import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ReachFront terms of service — usage rules, intellectual property, and your agreement with us.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PublicNav />
      <main className="pt-20">
        <div className="max-w-3xl mx-auto px-8 py-24 lg:py-32">
          <h1 className="text-[36px] lg:text-[48px] font-semibold text-ink leading-[1.1] tracking-[-0.02em] mb-8">
            Terms of Service
          </h1>
          <div className="prose prose-ink max-w-none text-[15px] leading-relaxed space-y-6">
            <p className="text-ink-muted">Last updated: May 2026</p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Acceptance</h2>
            <p className="text-ink-muted">
              By using ReachFront you agree to these terms. If you do not agree, do not use the service.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">The service</h2>
            <p className="text-ink-muted">
              ReachFront provides AI-powered tools for generating app store descriptions, auditing ASO scores,
              researching keywords, analyzing competitors, and validating demand. The service is provided
              &ldquo;as is&rdquo; and we may update, change, or discontinue features at any time.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Your content</h2>
            <p className="text-ink-muted">
              You own everything you generate. We do not claim rights to your inputs or outputs. We do not
              use your content to train AI models. You are responsible for ensuring your content does not
              infringe on third-party rights.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Acceptable use</h2>
            <p className="text-ink-muted">
              Do not use ReachFront to generate misleading, harmful, or illegal content. Do not attempt to
              circumvent rate limits or abuse the service. We reserve the right to suspend accounts that
              violate these terms.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Limitation of liability</h2>
            <p className="text-ink-muted">
              ReachFront is not responsible for app store rejections, ranking changes, or any business
              outcomes resulting from use of the service. AI-generated content should be reviewed before
              publishing.
            </p>

            <h2 className="text-[20px] font-semibold text-ink mt-8">Contact</h2>
            <p className="text-ink-muted">
              Questions about these terms? Reach us at{" "}
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
