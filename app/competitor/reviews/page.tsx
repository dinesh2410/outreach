"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { proxiedIcon } from "@/lib/icon-proxy";
import { useToast } from "@/components/shared/ToastProvider";
import { recordUsageForUser } from "@/lib/firestore";
import type {
  ReviewIntelligenceResult,
  ReviewIntelligenceRecord,
  ReviewTheme,
  FeatureRequest,
  AspectSentiment,
  MarketOpportunity,
  ScrapedReview,
  MyApp,
  UsageRecord,
} from "@/lib/types";
import {
  ArrowRight,
  Loader2,
  Target,
  TrendingUp,
  Star,
  Sparkles,
  History,
  Trash2,
  RefreshCw,
  ChartBar,
  Lightbulb,
  AlertTriangle,
  ChevronRight,
  Heart,
  Rocket,
  Apple,
  Smartphone,
  MessageSquare,
} from "@/components/shared/Icon";

function detectUserCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const locale = navigator.language ?? "en-US";
    const regionFromLocale = locale.split("-")[1]?.toLowerCase();
    if (regionFromLocale && regionFromLocale.length === 2) return regionFromLocale;
    const TZ_COUNTRY: Record<string, string> = {
      "Asia/Kolkata": "in", "Asia/Calcutta": "in", "Asia/Mumbai": "in",
      "America/New_York": "us", "America/Chicago": "us", "America/Los_Angeles": "us",
      "America/Denver": "us", "Europe/London": "gb", "Europe/Berlin": "de",
      "Europe/Paris": "fr", "America/Sao_Paulo": "br", "Asia/Tokyo": "jp",
      "Asia/Seoul": "kr", "Australia/Sydney": "au", "America/Toronto": "ca",
      "Europe/Madrid": "es", "Europe/Rome": "it", "Europe/Amsterdam": "nl",
      "America/Mexico_City": "mx", "Asia/Singapore": "sg",
    };
    return TZ_COUNTRY[tz] ?? "";
  } catch {
    return "";
  }
}

function reviewIntelIdFor(url: string): string {
  const key = url.toLowerCase().replace(/\s+/g, "");
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return `ri_${(h >>> 0).toString(36)}`;
}

export default function ReviewIntelligencePage() {
  return (
    <Suspense fallback={null}>
      <ReviewIntelligencePageInner />
    </Suspense>
  );
}

function ReviewIntelligencePageInner() {
  const { user, loading: authLoading, reviewIntelligence, recordReviewIntel, removeReviewIntel, myApps } =
    useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const { push } = useToast();

  const [appUrl, setAppUrl] = useState("");
  const [result, setResult] = useState<ReviewIntelligenceResult | null>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "scraping" | "analyzing">("idle");
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth?next=%2Fcompetitor%2Freviews");
  }, [user, authLoading, router]);

  const runAnalysis = useCallback(
    async (url: string) => {
      if (!url.trim()) return;
      setRunning(true);
      setResult(null);
      setSnapshotAt(null);
      setPhase("scraping");

      try {
        const userCountry = detectUserCountry();
        // Step 1: Scrape reviews
        const scrapeRes = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), country: userCountry }),
        });
        if (!scrapeRes.ok) {
          const err = await scrapeRes.json().catch(() => ({}));
          throw new Error(err.error ?? `Scrape failed: HTTP ${scrapeRes.status}`);
        }
        const { reviews, store } = (await scrapeRes.json()) as {
          reviews: ScrapedReview[];
          store: "play" | "ios";
        };

        if (reviews.length < 5) {
          throw new Error(
            `Only found ${reviews.length} review${reviews.length === 1 ? "" : "s"}. Need at least 5 for meaningful analysis.`
          );
        }

        // Fetch app metadata for the title/icon
        const metaRes = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        }).catch(() => null);
        const meta = metaRes?.ok ? await metaRes.json().catch(() => null) : null;

        // Step 2: AI analysis
        setPhase("analyzing");
        const intelligenceRes = await fetch("/api/review-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviews,
            appTitle: meta?.title,
            appUrl: url.trim(),
            store,
          }),
        });
        if (!intelligenceRes.ok) {
          const err = await intelligenceRes.json().catch(() => ({}));
          throw new Error(err.error ?? `Analysis failed: HTTP ${intelligenceRes.status}`);
        }
        const data = await intelligenceRes.json();
        const { usage, totalScraped, curatedCount, ...intelligence } = data;

        // Use real store numbers when available, fall back to scraped data
        const storeRating = typeof meta?.rating === "number" ? meta.rating : intelligence.globalSentiment?.avgRating;
        const storeRatingCount = typeof meta?.ratingCount === "number" ? meta.ratingCount : (totalScraped ?? reviews.length);

        // Use real per-star histogram from the store page when available
        const storeHistogram = meta?.ratingHistogram as
          | { star1: number; star2: number; star3: number; star4: number; star5: number }
          | undefined;

        // Compute sentiment from real histogram when available
        let sentimentFromHistogram = intelligence.globalSentiment;
        if (storeHistogram) {
          const total = storeHistogram.star1 + storeHistogram.star2 + storeHistogram.star3 + storeHistogram.star4 + storeHistogram.star5 || 1;
          sentimentFromHistogram = {
            positive: Math.round(((storeHistogram.star4 + storeHistogram.star5) / total) * 100),
            neutral: Math.round((storeHistogram.star3 / total) * 100),
            negative: Math.round(((storeHistogram.star1 + storeHistogram.star2) / total) * 100),
            avgRating: storeRating,
          };
        }

        const fullResult: ReviewIntelligenceResult = {
          ...intelligence,
          appUrl: url.trim(),
          appTitle: meta?.title,
          appIcon: meta?.iconUrl,
          store,
          reviewCount: storeRatingCount,
          ratingDistribution: storeHistogram ?? intelligence.ratingDistribution,
          globalSentiment: sentimentFromHistogram,
          scrapedAt: new Date().toISOString(),
        };

        setResult(fullResult);

        // Persist
        const record: ReviewIntelligenceRecord = {
          id: reviewIntelIdFor(url.trim()),
          appUrl: url.trim(),
          appTitle: meta?.title,
          store,
          reviewCount: storeRatingCount,
          avgRating: storeRating,
          positiveThemeCount: fullResult.positiveThemes.length,
          negativeThemeCount: fullResult.negativeThemes.length,
          opportunityCount: fullResult.marketOpportunities.length,
          createdAt: new Date().toISOString(),
          snapshot: fullResult,
        };
        recordReviewIntel(record);

        // Track usage
        if (user && usage) {
          const usageRecord: UsageRecord = {
            id: `ri-${Date.now()}`,
            userId: user.id,
            userEmail: user.email,
            tool: "review-intelligence",
            context: `target: ${meta?.title ?? url.trim()}`,
            totalInputTokens: usage.totalInputTokens,
            totalOutputTokens: usage.totalOutputTokens,
            totalTokens: usage.totalTokens,
            estimatedCostUsd: usage.estimatedCostUsd,
            elapsedMs: usage.elapsedMs,
            calls: usage.calls,
            createdAt: new Date().toISOString(),
          };
          recordUsageForUser(user.id, usageRecord).catch((err) =>
            console.error("[review-intelligence] usage persist failed:", err)
          );
        }
      } catch (err) {
        push(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setRunning(false);
        setPhase("idle");
      }
    },
    [push, recordReviewIntel, user]
  );

  // Deep-link replay
  const replayedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || authLoading) return;
    const replay = search.get("url");
    if (!replay) return;
    if (replayedRef.current === replay) return;
    replayedRef.current = replay;

    const id = reviewIntelIdFor(replay);
    const saved = reviewIntelligence.find((r) => r.id === id);
    setAppUrl(replay);

    if (saved?.snapshot) {
      setResult(saved.snapshot);
      setSnapshotAt(saved.createdAt);
      return;
    }
    runAnalysis(replay);
  }, [search, user, authLoading, runAnalysis, reviewIntelligence]);

  if (authLoading || !user) return null;

  function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (running || !appUrl.trim()) return;
    runAnalysis(appUrl);
  }

  function handleReset() {
    setResult(null);
    setAppUrl("");
    setSnapshotAt(null);
  }

  function handleRefresh() {
    if (running || !appUrl.trim()) return;
    runAnalysis(appUrl);
  }

  return (
    <AppShell
      eyebrow="Tools · Competitor Watch · Review Intelligence"
      title={result ? "Review intelligence" : "What do users really think?"}
      description={
        result
          ? snapshotAt
            ? `Saved snapshot · captured ${relativeTime(snapshotAt)}.`
            : `AI analysis of ${result.reviewCount} reviews from ${result.store === "ios" ? "App Store" : "Google Play"}.`
          : "Paste a competitor's app URL — we'll scrape their reviews and convert them into actionable competitive intelligence using AI."
      }
      actions={
        result ? (
          <div className="flex items-center gap-2">
            {snapshotAt && (
              <button
                onClick={handleRefresh}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {running ? (
                  <Loader2 size={13} className="animate-spin-slow" />
                ) : (
                  <RefreshCw size={13} strokeWidth={2} />
                )}
                {running ? "Refreshing…" : "Refresh data"}
              </button>
            )}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
            >
              New analysis
            </button>
          </div>
        ) : undefined
      }
    >
      {!result ? (
        <>
          <InputSection
            appUrl={appUrl}
            setAppUrl={setAppUrl}
            onSubmit={handleRun}
            running={running}
            phase={phase}
            myApps={myApps}
          />
          {reviewIntelligence.length > 0 && (
            <RecentAnalyses
              records={reviewIntelligence}
              onDelete={removeReviewIntel}
            />
          )}
        </>
      ) : (
        <Results result={result} />
      )}
    </AppShell>
  );
}

// ─── Input form ──────────────────────────────────────────────────────────

function InputSection({
  appUrl,
  setAppUrl,
  onSubmit,
  running,
  phase,
  myApps,
}: {
  appUrl: string;
  setAppUrl: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  running: boolean;
  phase: "idle" | "scraping" | "analyzing";
  myApps: MyApp[];
}) {
  return (
    <div className="max-w-3xl">
      <form onSubmit={onSubmit} className="card-soft p-7 space-y-7">
        <div>
          <label className="eyebrow mb-3 block">App to analyze</label>
          {myApps.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {myApps.map((app) => {
                  const selected = appUrl === app.url;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setAppUrl(selected ? "" : app.url)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
                        selected
                          ? "bg-ink text-white"
                          : "bg-cream-deep border border-line text-ink hover:border-ink-faint"
                      }`}
                    >
                      {app.iconUrl ? (
                        <img
                          src={proxiedIcon(app.iconUrl)}
                          alt=""
                          className="w-5 h-5 rounded-md"
                        />
                      ) : (
                        <Smartphone size={13} strokeWidth={1.85} />
                      )}
                      <span className="truncate max-w-[140px]">{app.name}</span>
                      <span className={`text-[10px] uppercase tracking-wider ${selected ? "text-white/70" : "text-ink-faint"}`}>
                        {app.source === "ios" ? "iOS" : "Play"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-px bg-line" />
                <span className="text-[11px] text-ink-faint uppercase tracking-widest">or enter URL</span>
                <div className="flex-1 h-px bg-line" />
              </div>
            </div>
          )}
          <input
            type="url"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            required
            placeholder="https://apps.apple.com/… or https://play.google.com/store/apps/details?id=…"
            className="w-full px-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
          />
          <p className="text-[12px] text-ink-faint mt-2">
            {myApps.length > 0
              ? "Pick from your apps above, or paste any store URL."
              : "We'll pull recent reviews and analyze them with AI to extract intelligence."}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-line-soft">
          <button
            type="submit"
            disabled={running || !appUrl.trim()}
            className="px-6 py-3.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 size={15} className="animate-spin-slow" />
                {phase === "scraping" ? "Fetching reviews…" : "Analyzing with AI…"}
              </>
            ) : (
              <>
                <Sparkles size={15} strokeWidth={2} />
                Analyze reviews
                <ArrowRight size={14} />
              </>
            )}
          </button>
          {!running && (
            <span className="text-[12px] text-ink-faint">
              Takes 15-30 seconds
            </span>
          )}
        </div>
      </form>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <BenefitTile
          tile="tile-lilac"
          icon={<MessageSquare size={16} strokeWidth={1.85} />}
          title="Real user feedback"
          desc="Pulled from Google Play and App Store. Hundreds of reviews, filtered for quality."
        />
        <BenefitTile
          tile="tile-mint"
          icon={<Lightbulb size={16} strokeWidth={1.85} />}
          title="Actionable intelligence"
          desc="Themes, sentiment trends, feature requests, and strategic opportunities — not just summaries."
        />
        <BenefitTile
          tile="tile-blue"
          icon={<Target size={16} strokeWidth={1.85} />}
          title="Market opportunities"
          desc="AI identifies gaps, unmet needs, and positioning angles you can exploit."
        />
      </div>
    </div>
  );
}

function BenefitTile({
  tile,
  icon,
  title,
  desc,
}: {
  tile: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card-soft p-5">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-[14px] font-semibold text-ink mb-1">{title}</p>
      <p className="text-[12px] text-ink-muted leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────────────

function RecentAnalyses({
  records,
  onDelete,
}: {
  records: ReviewIntelligenceRecord[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center">
          <History size={16} strokeWidth={1.85} />
        </div>
        <div>
          <p className="eyebrow">History</p>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
            Recent analyses
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.slice(0, 9).map((r) => {
          const replayHref = `/competitor/reviews?url=${encodeURIComponent(r.appUrl)}`;
          return (
            <div key={r.id} className="card-soft p-5 group relative">
              <Link href={replayHref} className="block">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] tile-lilac">
                    {r.reviewCount} reviews
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
                    {r.store === "ios" ? (
                      <Apple size={11} strokeWidth={1.85} />
                    ) : (
                      <Smartphone size={11} strokeWidth={1.85} />
                    )}
                    {r.store === "ios" ? "App Store" : "Play Store"}
                  </span>
                </div>

                <p className="text-[15px] font-semibold text-ink truncate">
                  {r.appTitle ?? "Untitled app"}
                </p>
                <p className="text-[11px] text-ink-faint truncate mt-0.5 font-mono">
                  {r.appUrl}
                </p>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Star size={10} fill="#FBBF24" stroke="#FBBF24" />
                    {(r.avgRating ?? 0).toFixed(1)}
                  </span>
                  <span>{r.positiveThemeCount} strengths</span>
                  <span>{r.negativeThemeCount} issues</span>
                  <span>{r.opportunityCount} opportunities</span>
                </div>

                <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                  <span className="tabular-nums">{relativeTime(r.createdAt)}</span>
                  <span className="inline-flex items-center gap-1 text-ink-muted">
                    View <ChevronRight size={10} />
                  </span>
                </div>
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(r.id);
                }}
                aria-label="Delete analysis"
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-ink-faint hover:text-warn hover:bg-warn/5"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Results ─────────────────────────────────────────────────────────────

function Results({ result }: { result: ReviewIntelligenceResult }) {
  return (
    <div className="space-y-10">
      {/* App banner */}
      <AppBanner result={result} />

      {/* Global sentiment + rating distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-3">
        <SentimentGauge sentiment={result.globalSentiment} />
        <RatingDistribution
          dist={result.ratingDistribution ?? { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 }}
          total={result.reviewCount}
          avgRating={result.globalSentiment.avgRating}
        />
        <div className="grid grid-cols-1 gap-3">
          <SignalTile
            icon={<Heart size={14} className="text-ink-muted" />}
            label="Strengths found"
            value={String(result.positiveThemes.length)}
            sub={`${result.positiveThemes.reduce((s, t) => s + t.mentionCount, 0)} mentions`}
          />
          <SignalTile
            icon={<AlertTriangle size={14} className="text-ink-muted" />}
            label="Issues found"
            value={String(result.negativeThemes.length)}
            sub={`${result.negativeThemes.reduce((s, t) => s + t.mentionCount, 0)} mentions`}
          />
        </div>
      </div>

      {/* Aspect sentiment chart */}
      {result.aspectSentiments.length > 0 && (
        <section>
          <SectionHeader
            tile="tile-blue"
            icon={<ChartBar size={16} strokeWidth={1.85} />}
            eyebrow="Aspect sentiment"
            title="How users feel about each area"
          />
          <AspectSentimentChart aspects={result.aspectSentiments} />
        </section>
      )}

      {/* Positive themes */}
      {result.positiveThemes.length > 0 && (
        <section>
          <SectionHeader
            tile="tile-mint"
            icon={<Heart size={16} strokeWidth={1.85} />}
            eyebrow="What users love"
            title="Positive themes"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.positiveThemes.map((theme, i) => (
              <ThemeCard key={i} theme={theme} />
            ))}
          </div>
        </section>
      )}

      {/* Negative themes */}
      {result.negativeThemes.length > 0 && (
        <section>
          <SectionHeader
            tile="tile-cream"
            icon={<AlertTriangle size={16} strokeWidth={1.85} />}
            eyebrow="Pain points"
            title="Complaints & frustrations"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.negativeThemes.map((theme, i) => (
              <ThemeCard key={i} theme={theme} />
            ))}
          </div>
        </section>
      )}

      {/* Feature requests */}
      {result.featureRequests.length > 0 && (
        <section>
          <SectionHeader
            tile="tile-lilac"
            icon={<Lightbulb size={16} strokeWidth={1.85} />}
            eyebrow="User demand"
            title="Feature requests"
          />
          <FeatureRequestsTable requests={result.featureRequests} />
        </section>
      )}

      {/* Market opportunities */}
      {result.marketOpportunities.length > 0 && (
        <section>
          <SectionHeader
            tile="tile-blue"
            icon={<Rocket size={16} strokeWidth={1.85} />}
            eyebrow="Strategic intelligence"
            title="Market opportunities"
          />
          <div className="grid grid-cols-1 gap-4">
            {result.marketOpportunities.map((opp, i) => (
              <OpportunityCard key={i} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Competitor summary */}
      <CompetitorSummarySection summary={result.competitorSummary} />

      {/* CTA */}
      <section className="card-soft p-7">
        <p className="eyebrow mb-3">Next step</p>
        <h2 className="text-[24px] font-semibold tracking-[-0.01em] mb-3" style={{ color: "#0B3D7A" }}>
          Use this intelligence
        </h2>
        <p className="text-[14px] text-ink-muted leading-relaxed mb-6 max-w-lg">
          Take the market gaps and user frustrations to the ASO Generator. Write a listing that
          directly addresses what competitor users are missing.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/generator"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
          >
            <Sparkles size={15} strokeWidth={2} />
            Open ASO Generator
          </Link>
          <Link
            href="/competitor"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-line text-[14px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            <Target size={15} strokeWidth={2} />
            Competitor Watch
          </Link>
        </div>
      </section>
    </div>
  );
}

// ─── App banner ──────────────────────────────────────────────────────────

function AppBanner({ result }: { result: ReviewIntelligenceResult }) {
  const [iconBroken, setIconBroken] = useState(false);
  const iconSrc = result.appIcon ? proxiedIcon(result.appIcon) : null;
  const showIcon = iconSrc && !iconBroken;

  return (
    <div className="card-soft p-5 flex items-start gap-4 flex-wrap">
      {showIcon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconSrc}
          alt={result.appTitle ?? "App icon"}
          onError={() => setIconBroken(true)}
          className="w-14 h-14 rounded-xl shrink-0 bg-cream-deep object-cover"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl tile-blue flex items-center justify-center shrink-0 font-bold text-[20px]">
          {(result.appTitle ?? "?").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="eyebrow">Competitor analyzed</p>
        <p className="text-[18px] font-semibold text-ink mt-0.5">{result.appTitle ?? "Unknown app"}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            {result.store === "ios" ? <Apple size={12} /> : <Smartphone size={12} />}
            {result.store === "ios" ? "App Store" : "Play Store"}
          </span>
          <span>{result.globalSentiment.avgRating.toFixed(1)}★ avg rating</span>
          <span>Analyzed {relativeTime(result.scrapedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sentiment gauge ─────────────────────────────────────────────────────

function SentimentGauge({
  sentiment,
}: {
  sentiment: ReviewIntelligenceResult["globalSentiment"];
}) {
  const radius = 56;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const positivePct = sentiment.positive / 100;
  const progress = positivePct * circumference;
  const color =
    sentiment.positive >= 70
      ? "#16A34A"
      : sentiment.positive >= 40
        ? "#D97706"
        : "#DC2626";
  const label =
    sentiment.positive >= 70
      ? "Mostly positive"
      : sentiment.positive >= 40
        ? "Mixed"
        : "Mostly negative";

  return (
    <div className="card-soft p-5 flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-bold tabular-nums leading-none" style={{ color }}>
            {Math.round(sentiment.positive)}%
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint mt-1">
            positive
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">Overall sentiment</p>
        <p className="text-[18px] font-semibold mt-1" style={{ color }}>
          {label}
        </p>
        <div className="mt-3 space-y-1.5">
          <SentimentBar label="Positive" pct={sentiment.positive} color="#16A34A" />
          <SentimentBar label="Neutral" pct={sentiment.neutral} color="#D97706" />
          <SentimentBar label="Negative" pct={sentiment.negative} color="#DC2626" />
        </div>
      </div>
    </div>
  );
}

function SentimentBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-ink-muted w-[60px] shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-cream-deep overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] text-ink-faint tabular-nums w-[36px] text-right shrink-0">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function RatingDistribution({
  dist,
  total,
  avgRating,
}: {
  dist: ReviewIntelligenceResult["ratingDistribution"];
  total: number;
  avgRating: number;
}) {
  const bars = [
    { label: "5★", count: dist.star5, color: "#16A34A" },
    { label: "4★", count: dist.star4, color: "#65A30D" },
    { label: "3★", count: dist.star3, color: "#D97706" },
    { label: "2★", count: dist.star2, color: "#EA580C" },
    { label: "1★", count: dist.star1, color: "#DC2626" },
  ];
  const sampleTotal = bars.reduce((s, b) => s + b.count, 0) || 1;
  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="card-soft p-5">
      <p className="eyebrow mb-1">Rating breakdown</p>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[28px] font-bold tabular-nums leading-none text-ink">
          {avgRating.toFixed(1)}
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={13}
              fill={s <= Math.round(avgRating) ? "#FBBF24" : "#E2E8F0"}
              stroke={s <= Math.round(avgRating) ? "#FBBF24" : "#E2E8F0"}
            />
          ))}
        </div>
        <span className="text-[11px] text-ink-faint">{formatCount(total)} ratings</span>
      </div>
      <div className="space-y-2">
        {bars.map((b) => {
          const pct = Math.round((b.count / sampleTotal) * 100);
          return (
            <div key={b.label} className="flex items-center gap-2 group/bar" title={`${b.count.toLocaleString()} ratings`}>
              <span className="text-[12px] text-ink-muted w-[24px] shrink-0 tabular-nums">{b.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-cream-deep overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(b.count / max) * 100}%`, backgroundColor: b.color }}
                />
              </div>
              <span className="text-[11px] text-ink-faint tabular-nums w-[36px] text-right shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Aspect sentiment chart ──────────────────────────────────────────────

function AspectSentimentChart({ aspects }: { aspects: AspectSentiment[] }) {
  return (
    <div className="card-soft p-6">
      <div className="space-y-4">
        {aspects.map((a) => {
          const trendIcon =
            a.trend === "improving" ? "↑" : a.trend === "declining" ? "↓" : "→";
          const trendColor =
            a.trend === "improving"
              ? "text-green"
              : a.trend === "declining"
                ? "text-warn"
                : "text-ink-faint";
          return (
            <div key={a.aspect}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold text-ink">{a.aspect}</span>
                <span className={`text-[11px] font-medium ${trendColor}`}>
                  {trendIcon} {a.trend}
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-cream-deep">
                <div
                  className="h-full transition-all"
                  style={{ width: `${a.positive}%`, backgroundColor: "#16A34A" }}
                  title={`Positive: ${Math.round(a.positive)}%`}
                />
                <div
                  className="h-full transition-all"
                  style={{ width: `${a.neutral}%`, backgroundColor: "#D97706" }}
                  title={`Neutral: ${Math.round(a.neutral)}%`}
                />
                <div
                  className="h-full transition-all"
                  style={{ width: `${a.negative}%`, backgroundColor: "#DC2626" }}
                  title={`Negative: ${Math.round(a.negative)}%`}
                />
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-ink-faint">
                <span>{Math.round(a.positive)}% positive</span>
                <span>{Math.round(a.neutral)}% neutral</span>
                <span>{Math.round(a.negative)}% negative</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-line-soft text-[10px] text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#16A34A" }} />
          Positive
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#D97706" }} />
          Neutral
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#DC2626" }} />
          Negative
        </span>
      </div>
    </div>
  );
}

// ─── Theme cards ─────────────────────────────────────────────────────────

function ThemeCard({ theme }: { theme: ReviewTheme }) {
  const tile = theme.tone === "positive" ? "tile-mint" : "tile-cream";
  const trendIcon =
    theme.trend === "rising" ? "↑" : theme.trend === "declining" ? "↓" : "→";
  const trendColor =
    theme.tone === "positive"
      ? theme.trend === "rising"
        ? "text-green"
        : "text-ink-faint"
      : theme.trend === "rising"
        ? "text-warn"
        : theme.trend === "declining"
          ? "text-green"
          : "text-ink-faint";

  return (
    <div className="card-soft p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${tile} flex items-center justify-center shrink-0`}>
          {theme.tone === "positive" ? (
            <Heart size={14} strokeWidth={1.85} />
          ) : (
            <AlertTriangle size={14} strokeWidth={1.85} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink">{theme.theme}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted">
            <span>{theme.mentionCount} mentions</span>
            <span className={`font-medium ${trendColor}`}>
              {trendIcon} {theme.trend}
            </span>
            <span>
              strength: {Math.round(theme.sentimentStrength * 100)}%
            </span>
          </div>
        </div>
      </div>

      {theme.sampleQuotes.length > 0 && (
        <div className="space-y-2 pl-12">
          {theme.sampleQuotes.map((q, i) => (
            <p key={i} className="text-[12px] text-ink-muted leading-relaxed italic">
              &ldquo;{q}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feature requests table ──────────────────────────────────────────────

function FeatureRequestsTable({ requests }: { requests: FeatureRequest[] }) {
  return (
    <div className="card-soft overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-line-soft">
            <th className="text-left text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint px-5 py-4">
              Feature request
            </th>
            <th className="text-left text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint px-4 py-4 w-[100px]">
              Frequency
            </th>
            <th className="text-left text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint px-4 py-4 w-[100px]">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => {
            const trendIcon =
              r.growthTrend === "rising" ? "↑" : r.growthTrend === "declining" ? "↓" : "→";
            const trendColor =
              r.growthTrend === "rising"
                ? "text-green font-medium"
                : r.growthTrend === "declining"
                  ? "text-ink-faint"
                  : "text-ink-muted";
            return (
              <tr key={i} className="border-b border-line-soft last:border-0">
                <td className="text-[13px] font-medium text-ink px-5 py-3.5">{r.request}</td>
                <td className="text-[13px] text-ink-muted px-4 py-3.5 tabular-nums">
                  {r.frequency} mentions
                </td>
                <td className={`text-[13px] px-4 py-3.5 ${trendColor}`}>
                  {trendIcon} {r.growthTrend}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Opportunity cards ───────────────────────────────────────────────────

function OpportunityCard({ opportunity }: { opportunity: MarketOpportunity }) {
  const categoryLabels: Record<MarketOpportunity["category"], string> = {
    feature_gap: "Feature gap",
    trust_issue: "Trust issue",
    ux_pain: "UX pain point",
    monetization: "Monetization",
    unmet_need: "Unmet need",
  };
  const categoryTiles: Record<MarketOpportunity["category"], string> = {
    feature_gap: "tile-lilac",
    trust_issue: "tile-cream",
    ux_pain: "tile-blue",
    monetization: "tile-mint",
    unmet_need: "tile-lilac",
  };
  const confidenceColors: Record<MarketOpportunity["confidence"], string> = {
    high: "bg-green/10 text-green border-green/30",
    medium: "bg-gold/10 text-gold border-gold/30",
    low: "bg-ink-faint/10 text-ink-muted border-line",
  };

  return (
    <div
      className="card-soft p-6"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F0FF 100%)" }}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${categoryTiles[opportunity.category]} flex items-center justify-center shrink-0`}>
          <Rocket size={16} strokeWidth={1.85} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] border ${confidenceColors[opportunity.confidence]}`}>
              {opportunity.confidence} confidence
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${categoryTiles[opportunity.category]}`}>
              {categoryLabels[opportunity.category]}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-ink leading-snug">{opportunity.opportunity}</p>
          <p className="text-[13px] text-ink-muted leading-relaxed mt-2">
            <span className="font-medium text-ink-muted">Signal:</span> {opportunity.signal}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Competitor summary ──────────────────────────────────────────────────

function CompetitorSummarySection({
  summary,
}: {
  summary: ReviewIntelligenceResult["competitorSummary"];
}) {
  return (
    <section>
      <SectionHeader
        tile="tile-cream"
        icon={<Sparkles size={16} strokeWidth={1.85} />}
        eyebrow="Intelligence brief"
        title="Competitor assessment"
      />
      <div
        className="card-soft p-6"
        style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FDF2FA 100%)" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SummaryList title="Strengths" items={summary.strengths} color="#16A34A" />
          <SummaryList title="Weaknesses" items={summary.weaknesses} color="#DC2626" />
          {summary.risingIssues.length > 0 && (
            <SummaryList title="Rising issues" items={summary.risingIssues} color="#D97706" />
          )}
          <SummaryList
            title="Strategic opportunities"
            items={summary.strategicOpportunities}
            color="#2563EB"
          />
        </div>
      </div>
    </section>
  );
}

function SummaryList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-ink leading-snug">
            <span className="mt-1 shrink-0" style={{ color }}>
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Shared components ───────────────────────────────────────────────────

function SignalTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-1.5 mb-2 text-ink-muted">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">{label}</p>
      </div>
      <p className="text-[20px] font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({
  tile,
  icon,
  eyebrow,
  title,
}: {
  tile: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
