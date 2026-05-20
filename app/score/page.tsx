"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { AppShell } from "@/components/shared/AppShell";
import { AppPicker } from "@/components/shared/AppPicker";
import { useAuth } from "@/lib/auth";
import type { AuditPayload, MyApp, ScoreResult } from "@/lib/types";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  FileText,
  MagnifyingGlass,
  Medal,
  ListChecks,
} from "@/components/shared/Icon";

// URL-only preview score — mirrors the server's legacy fallback so the page
// has something to render before the audit returns. The detailed report
// always uses the server-computed score from /api/audit.
function urlOnlyPreview(url: string): ScoreResult {
  const charSum = url.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const score = (charSum % 30) + 55;
  const grade =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
  return {
    score,
    grade,
    checks: [
      {
        label: "Listing preview only",
        passed: false,
        note:
          "We haven't fetched the live listing yet — this is a quick preview. Open the detailed report for a real audit.",
      },
    ],
  };
}

// Fetches the live audit and pulls the server-computed score out of the
// payload. Falls back to the URL-only preview when the audit endpoint is
// unreachable.
async function runLiveAudit(url: string, keyword?: string): Promise<ScoreResult> {
  try {
    const payload: Record<string, string> = { url };
    if (keyword?.trim()) payload.keyword = keyword.trim();
    const r = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as AuditPayload;
    if (data?.score?.checks) {
      return {
        score: data.score.score,
        grade: data.score.grade,
        checks: data.score.checks,
      };
    }
    return urlOnlyPreview(url);
  } catch {
    return urlOnlyPreview(url);
  }
}

// Top-level dispatcher: signed-in visitors get the in-app shell (matches the
// Competitor Watch / Keyword Research entry points); everyone else gets the
// public marketing landing with PublicNav + hero + CTA. The audit form +
// result card are identical between the two — only the chrome differs.
export default function ScorePage() {
  return (
    <Suspense fallback={null}>
      <ScorePageInner />
    </Suspense>
  );
}

function ScorePageInner() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <ScorePageAuthed /> : <ScorePagePublic />;
}

function ScorePageAuthed() {
  const search = useSearchParams();
  const { myApps } = useAuth();
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current) return;
    const fromQuery = search.get("url");
    if (fromQuery) {
      setUrl(fromQuery);
      prefilled.current = true;
    }
    const kwFromQuery = search.get("keyword");
    if (kwFromQuery) setKeyword(kwFromQuery);
  }, [search]);

  function handleSelectSaved(app: MyApp) {
    setUrl(app.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    const r = await runLiveAudit(url.trim(), keyword);
    setResult(r);
    setSubmitting(false);
  }

  function handleReset() {
    setResult(null);
    setUrl("");
    setKeyword("");
  }

  return (
    <AppShell
      eyebrow="Tools · ASO Score"
      title={result ? `Grade ${result.grade} · ${result.score}/100` : "Audit any listing"}
      description={
        result
          ? "Quick check below. Open the detailed report for the full per-check breakdown, listing snapshot, and recommended fixes."
          : "Drop your App Store or Play Store URL — or pick one you've saved — and we'll score it 0–100 against the ASO playbook."
      }
    >
      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="card-soft p-7 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="eyebrow">Listing URL</label>
            {myApps.length > 0 && (
              <AppPicker onSelect={handleSelectSaved} buttonLabel="Pick a saved app" align="right" />
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://apps.apple.com/… or https://play.google.com/store/apps/details?id=…"
              className="flex-1 px-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Scoring…" : "Score it"}
              {!submitting && <ArrowRight size={14} />}
            </button>
          </div>

          <div className="mt-4">
            <label className="eyebrow text-[10px] mb-1.5 block">Primary keyword <span className="font-normal text-ink-faint tracking-normal normal-case">· optional</span></label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. cloud storage, habit tracker, budget planner"
              className="w-full px-5 py-3 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
            />
            <p className="text-[11px] text-ink-faint mt-1.5">
              The search term you want to rank for. Leave empty to let AI detect it from the listing.
            </p>
          </div>
        </form>

        <div className="card-soft p-7">
          {!result ? (
            <EmptyAudit />
          ) : (
            <FilledAudit result={result} url={url} keyword={keyword} onReset={handleReset} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ScorePagePublic() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    const r = await runLiveAudit(url.trim(), keyword);
    setResult(r);
    setSubmitting(false);
  }

  function handleReset() {
    setResult(null);
    setUrl("");
    setKeyword("");
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
                className="mt-9 max-w-lg"
              >
                <div className="flex flex-col sm:flex-row gap-3">
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
                </div>
                <div className="mt-3">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Primary keyword (optional) — e.g. cloud storage, habit tracker"
                    className="w-full px-5 py-3 rounded-full bg-white border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
                  />
                </div>
              </form>
              <p className="mt-3 text-[12px] text-ink-muted">
                We fetch your live listing and run a full audit against ASO standards.
              </p>
            </div>

            <div className="relative">
              {/* Live audit card */}
              <div className="card-soft p-7 bg-white max-w-md mx-auto">
                {!result ? (
                  <EmptyAudit />
                ) : (
                  <FilledAudit result={result} url={url} keyword={keyword} onReset={handleReset} />
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
                  "Title length & format",
                  "Short description leads with action",
                  "Hook anchors the brand name",
                  "Body split into labelled sections",
                  "Uses the right bullet character (•)",
                  "Hits core benefit keywords",
                ].map((label, i) => (
                  <div key={label} className="card-soft p-6 flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        i % 3 === 0 ? "tile-blue" : i % 3 === 1 ? "tile-lilac" : "tile-mint"
                      }`}
                    >
                      <ListChecks size={16} strokeWidth={1.85} />
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
          <MagnifyingGlass size={18} strokeWidth={1.85} />
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
  keyword,
  onReset,
}: {
  result: ScoreResult;
  url: string;
  keyword?: string;
  onReset: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();

  function openDetailedReport() {
    const params = new URLSearchParams({ url });
    if (keyword?.trim()) params.set("keyword", keyword.trim());
    const target = `/score/report?${params.toString()}`;
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
            <Medal size={18} strokeWidth={1.85} />
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
