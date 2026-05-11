"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { calculateScore } from "@/lib/score";
import { useAuth } from "@/lib/auth";
import type { ScoreResult } from "@/lib/types";
import { ArrowRight, Sparkles, CheckCircle2, AlertCircle, RotateCcw, FileText } from "lucide-react";

export default function ScorePage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    // Tiny artificial latency so the "audit in progress" feedback is visible.
    setTimeout(() => {
      setResult(calculateScore(url.trim()));
      setSubmitting(false);
    }, 350);
  }

  function handleReset() {
    setResult(null);
    setUrl("");
  }

  return (
    <>
      <PublicNav />
      <main className="pt-20">
        {/* Hero band */}
        <section style={{ backgroundColor: "#D7E5FB" }}>
          <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-28 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
            <div>
              <p className="eyebrow mb-5">Free · No sign-up required</p>
              <h1 className="text-[44px] lg:text-[64px] font-semibold text-ink leading-[1.05] tracking-[-0.02em]">
                Audit your listing in seconds
              </h1>
              <p className="mt-7 text-[17px] lg:text-[19px] text-ink leading-relaxed max-w-xl">
                Drop your App Store or Play Store URL. We&apos;ll score it
                0&ndash;100 against the ASO playbook and tell you exactly what
                to fix next.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-9 flex flex-col sm:flex-row gap-3 max-w-lg"
              >
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://apps.apple.com/…"
                  className="flex-1 px-5 py-3.5 rounded-full bg-white border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3.5 rounded-full bg-ink text-white text-[15px] font-medium hover:bg-night-soft transition-colors inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Scoring…" : "Score it"}
                  {!submitting && <ArrowRight size={15} />}
                </button>
              </form>
              <p className="mt-3 text-[12px] text-ink-muted">
                Deterministic score based on the URL — same input always returns the same audit.
              </p>
            </div>

            <div className="relative">
              {/* Live audit card */}
              <div className="card-soft p-7 bg-white max-w-md mx-auto">
                {!result ? (
                  <EmptyAudit />
                ) : (
                  <FilledAudit result={result} url={url} onReset={handleReset} />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* What we check */}
        {!result && (
          <section className="bg-white">
            <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <p className="eyebrow mb-5">What we check</p>
                <h2
                  className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em]"
                  style={{ color: "#0B3D7A" }}
                >
                  Every ASO surface, scored
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {[
                  "Title uses primary keyword",
                  "Short description under 80 chars",
                  "Full description is keyword-balanced",
                  "Description leads with a hook",
                  "Uses bullet points for features",
                  "Mentions target audience",
                ].map((label, i) => (
                  <div key={label} className="card-soft p-6 flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        i % 3 === 0 ? "tile-blue" : i % 3 === 1 ? "tile-lilac" : "tile-mint"
                      }`}
                    >
                      <Sparkles size={16} strokeWidth={1.85} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-ink">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section style={{ backgroundColor: "#D7E5FB" }}>
          <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-28 text-center">
            <h2 className="text-[40px] lg:text-[56px] font-semibold text-ink leading-[1.05] tracking-[-0.02em] max-w-3xl mx-auto">
              Want more than a score?
            </h2>
            <p className="mt-6 text-[17px] text-ink max-w-xl mx-auto leading-relaxed">
              Sign up free to generate descriptions, save variants to your
              library, and track your score over time.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 mt-10 px-6 py-3 rounded-full bg-ink text-white text-[15px] font-medium hover:bg-night-soft transition-colors"
            >
              Get started free
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function EmptyAudit() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl tile-blue flex items-center justify-center">
          <Sparkles size={18} strokeWidth={1.85} />
        </div>
        <div>
          <p className="eyebrow">Ready when you are</p>
          <p className="text-[15px] font-semibold text-ink">Paste a URL to begin</p>
        </div>
      </div>
      <p className="text-[14px] text-ink-muted leading-relaxed mb-6">
        Your audit will appear here. We look at title, description, hook,
        keywords, structure, and audience targeting.
      </p>
      <div className="space-y-3 opacity-40">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-cream-deep" />
            <div className="flex-1">
              <div className="h-2 rounded bg-cream-deep w-full mb-1.5" />
              <div className="h-1.5 rounded bg-cream-deep w-[60%]" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FilledAudit({
  result,
  url,
  onReset,
}: {
  result: ScoreResult;
  url: string;
  onReset: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();

  function openDetailedReport() {
    const target = `/score/report?url=${encodeURIComponent(url)}`;
    if (user) {
      router.push(target);
    } else {
      router.push(`/auth?next=${encodeURIComponent(target)}`);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl tile-blue flex items-center justify-center">
            <Sparkles size={18} strokeWidth={1.85} />
          </div>
          <div>
            <p className="eyebrow">Audit complete</p>
            <p className="text-[15px] font-semibold text-ink">Grade {result.grade}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[40px] font-bold leading-none" style={{ color: "#0B3D7A" }}>
            {result.score}
          </p>
          <p className="text-[10px] text-ink-faint uppercase tracking-wider mt-1">/ 100</p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-cream-deep overflow-hidden mb-6">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${result.score}%`, backgroundColor: "#2563EB" }}
        />
      </div>

      <ul className="space-y-3 mb-6">
        {result.checks.map((c) => (
          <li key={c.label} className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                c.passed ? "tile-mint" : "tile-cream"
              }`}
            >
              {c.passed ? (
                <CheckCircle2 size={13} strokeWidth={2.25} />
              ) : (
                <AlertCircle size={13} strokeWidth={2.25} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink">{c.label}</p>
              <p className="text-[11px] text-ink-muted leading-relaxed mt-0.5">{c.note}</p>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={openDetailedReport}
        className="w-full px-4 py-3 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors inline-flex items-center justify-center gap-2 mb-2.5"
      >
        <FileText size={14} strokeWidth={2.25} />
        View detailed report
        <ArrowRight size={13} strokeWidth={2.25} />
      </button>
      {!user && (
        <p className="text-[11px] text-ink-faint text-center mb-3 -mt-1">
          Sign in to see the full breakdown.
        </p>
      )}

      <button
        onClick={onReset}
        className="w-full px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors inline-flex items-center justify-center gap-2"
      >
        <RotateCcw size={13} />
        Audit another listing
      </button>
    </>
  );
}
