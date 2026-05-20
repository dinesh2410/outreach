"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { proxiedIcon } from "@/lib/icon-proxy";
import { detectUserCountry } from "@/lib/geo";
import { useToast } from "@/components/shared/ToastProvider";
import type { KeywordRankRecord, UsageRecord } from "@/lib/types";
import type { KeywordRankResult, RankStore, RankedApp, KeywordInsight } from "@/lib/keyword-rank";
import { recordUsageForUser } from "@/lib/firestore";
import {
  ArrowRight,
  Loader2,
  Search,
  Apple,
  Smartphone,
  Globe,
  ExternalLink,
  Star,
  Hash,
  Clock,
  Trash2,
  History,
  Sparkles,
  RefreshCw,
  Archive,
  ChevronDown,
  Lightbulb,
  TrendingUp,
  Target,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
} from "@/components/shared/Icon";

// Deterministic id from query tuple so re-running the same check updates the
// existing record instead of duplicating.
function keywordRankIdFor(args: {
  keyword: string;
  country: string;
  lang: string;
  store: RankStore;
}): string {
  const key = [args.keyword.trim().toLowerCase(), args.country, args.lang, args.store].join("|");
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return `kw_${(h >>> 0).toString(36)}`;
}

const COUNTRIES: { code: string; label: string }[] = [
  { code: "auto", label: "Auto (your location)" },
  { code: "us", label: "United States" },
  { code: "in", label: "India" },
  { code: "gb", label: "United Kingdom" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "br", label: "Brazil" },
  { code: "jp", label: "Japan" },
  { code: "kr", label: "South Korea" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
];

const STORE_OPTIONS: { id: RankStore; label: string; hint: string }[] = [
  { id: "both", label: "Both stores", hint: "Round-robin Play + App Store" },
  { id: "play", label: "Play Store", hint: "Google Play search ranking" },
  { id: "ios", label: "App Store", hint: "App Store search ranking" },
];

const LIMIT_OPTIONS = [10, 20, 30];

export default function KeywordsPage() {
  return (
    <Suspense fallback={null}>
      <KeywordsPageInner />
    </Suspense>
  );
}

function KeywordsPageInner() {
  const { user, loading: authLoading, keywordRanks, recordKeywordRank, removeKeywordRank } =
    useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const { push } = useToast();

  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("auto");
  const [lang, setLang] = useState("en");
  const [store, setStore] = useState<RankStore>("both");
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState<KeywordRankResult | null>(null);
  const [running, setRunning] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  // When we load a saved snapshot from history instead of re-fetching live,
  // we track the saved-at timestamp so the UI can show a "Snapshot from …"
  // banner + offer a Refresh button. null = current/live data.
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth?next=%2Fkeywords");
  }, [user, authLoading, router]);

  const runCheck = useCallback(
    async (args: {
      keyword: string;
      country: string;
      lang: string;
      store: RankStore;
      limit: number;
    }) => {
      if (!args.keyword.trim()) return;
      setRunning(true);
      setResult(null);
      setSnapshotAt(null);
      try {
        // When the user picked "auto", probe the browser for an IP-based
        // country hint. The server prefers its own edge headers over this
        // (production wins immediately); the hint only kicks in for local
        // dev where edge headers aren't populated. Failure is silent —
        // the server still has its "us" fallback.
        const clientCountry =
          args.country === "auto" ? await detectUserCountry().catch(() => null) : null;
        const res = await fetch("/api/keyword-rank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...args, clientCountry: clientCountry ?? undefined }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as KeywordRankResult;
        setResult(data);

        // Fire the LLM insight in the background. Doesn't block the user
        // from seeing the rank list — populates the Insight card a few
        // seconds later. Failures are silent.
        if (data.apps.length > 0) {
          setInsightLoading(true);
          (async () => {
            try {
              const insightRes = await fetch("/api/keyword-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  keyword: data.keyword,
                  country: data.country,
                  store: data.store,
                  apps: data.apps,
                }),
              });
              if (!insightRes.ok) throw new Error(`HTTP ${insightRes.status}`);
              const insightData = (await insightRes.json()) as KeywordInsight & {
                usage?: {
                  calls: UsageRecord["calls"];
                  totalInputTokens: number;
                  totalOutputTokens: number;
                  totalTokens: number;
                  estimatedCostUsd: number;
                  elapsedMs: number;
                };
              };
              const { usage: insightUsage, ...insight } = insightData;
              const enriched: KeywordRankResult = { ...data, insight };
              setResult(enriched);

              // Persist the snapshot with the insight included so history
              // replay shows the same insight without a re-call.
              const record: KeywordRankRecord = {
                id: keywordRankIdFor(args),
                keyword: args.keyword.trim(),
                country: args.country,
                lang: args.lang,
                store: args.store,
                limit: args.limit,
                topResultsCount: enriched.apps.length,
                topResultTitle: enriched.apps[0]?.title,
                createdAt: new Date().toISOString(),
                snapshot: enriched,
              };
              recordKeywordRank(record);

              // Track usage so /admin/usage sees the call.
              if (user && insightUsage) {
                const usageRecord: UsageRecord = {
                  id: `kwi-${Date.now()}`,
                  userId: user.id,
                  userEmail: user.email,
                  tool: "keyword-insight",
                  context: `keyword: ${data.keyword}`,
                  totalInputTokens: insightUsage.totalInputTokens,
                  totalOutputTokens: insightUsage.totalOutputTokens,
                  totalTokens: insightUsage.totalTokens,
                  estimatedCostUsd: insightUsage.estimatedCostUsd,
                  elapsedMs: insightUsage.elapsedMs,
                  calls: insightUsage.calls,
                  createdAt: new Date().toISOString(),
                };
                recordUsageForUser(user.id, usageRecord).catch((err) =>
                  console.error("[keywords] insight usage persist failed:", err)
                );
              }
            } catch (err) {
              console.warn("[keywords] insight failed:", err);
              // Still persist the rank snapshot (without insight) so it's in history.
              const record: KeywordRankRecord = {
                id: keywordRankIdFor(args),
                keyword: args.keyword.trim(),
                country: args.country,
                lang: args.lang,
                store: args.store,
                limit: args.limit,
                topResultsCount: data.apps.length,
                topResultTitle: data.apps[0]?.title,
                createdAt: new Date().toISOString(),
                snapshot: data,
              };
              recordKeywordRank(record);
            } finally {
              setInsightLoading(false);
            }
          })();
        } else {
          // No apps → no insight to generate. Still persist the (empty) snapshot.
          const record: KeywordRankRecord = {
            id: keywordRankIdFor(args),
            keyword: args.keyword.trim(),
            country: args.country,
            lang: args.lang,
            store: args.store,
            limit: args.limit,
            topResultsCount: data.apps.length,
            topResultTitle: data.apps[0]?.title,
            createdAt: new Date().toISOString(),
            snapshot: data,
          };
          recordKeywordRank(record);
        }
      } catch (err) {
        push(err instanceof Error ? err.message : "Rank check failed");
      } finally {
        setRunning(false);
      }
    },
    [push, recordKeywordRank, user]
  );

  // Deep-link replay: /keywords?keyword=...&country=...&store=... loads the
  // saved snapshot when one exists (so the user sees the exact data they
  // saved), and only re-fetches live when there's no snapshot. The Refresh
  // button lets them pull fresh data when they're ready.
  //
  // IMPORTANT: we must wait for `authLoading` to settle before deciding —
  // otherwise the effect can fire while `keywordRanks` is still empty
  // (Firestore hydration in flight), find no match, fire a live fetch, and
  // overwrite the snapshot the user clicked from history.
  const replayedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || authLoading) return;
    const kw = search.get("keyword");
    if (!kw) return;
    const c = (search.get("country") ?? "us").toLowerCase();
    const l = (search.get("lang") ?? "en").toLowerCase();
    const s = (search.get("store") ?? "both") as RankStore;
    const lim = Number(search.get("limit") ?? 10);
    const key = [kw.trim().toLowerCase(), c, l, s, lim].join("|");
    if (replayedRef.current === key) return;

    const id = keywordRankIdFor({ keyword: kw, country: c, lang: l, store: s });
    const saved = keywordRanks.find((r) => r.id === id);

    replayedRef.current = key;
    setKeyword(kw);
    setCountry(c);
    setLang(l);
    setStore(s);
    setLimit(LIMIT_OPTIONS.includes(lim) ? lim : 10);

    if (saved?.snapshot) {
      // Restore the exact saved view; URL-driven sync from external state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(saved.snapshot);
      setSnapshotAt(saved.createdAt);
      return;
    }
    runCheck({ keyword: kw, country: c, lang: l, store: s, limit: lim });
  }, [search, user, authLoading, runCheck, keywordRanks]);

  if (authLoading || !user) return null;

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (running || !keyword.trim()) return;
    await runCheck({ keyword, country, lang, store, limit });
  }

  function handleReset() {
    setResult(null);
    setSnapshotAt(null);
  }

  async function handleRefresh() {
    if (running) return;
    await runCheck({ keyword, country, lang, store, limit });
  }

  return (
    <AppShell
      eyebrow="Tools · Keyword Research"
      title={result ? `Top ${result.apps.length} for "${result.keyword}"` : "What ranks for this keyword?"}
      description={
        result
          ? snapshotAt
            ? `Saved snapshot · ${storeLabel(result.store)} · ${result.country.toUpperCase()} · captured ${relativeTime(snapshotAt)}.`
            : `${storeLabel(result.store)} · ${result.country.toUpperCase()} · pulled ${relativeTime(result.cachedAt)}${result.fromCache ? " (cached)" : ""}.`
          : "Type a keyword and we'll show you the live ranking on the App Store and Google Play. Use it to see where your app — or your competitors — surface today."
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
              New rank check
            </button>
          </div>
        ) : undefined
      }
    >
      {!result ? (
        <>
          <InputForm
            keyword={keyword}
            setKeyword={setKeyword}
            country={country}
            setCountry={setCountry}
            store={store}
            setStore={setStore}
            limit={limit}
            setLimit={setLimit}
            onSubmit={handleRun}
            running={running}
          />
          {keywordRanks.length > 0 && (
            <RecentRanks records={keywordRanks} onDelete={removeKeywordRank} />
          )}
        </>
      ) : (
        <>
          {snapshotAt && <SnapshotBanner savedAt={snapshotAt} onRefresh={handleRefresh} running={running} />}
          <Results result={result} insightLoading={insightLoading} />
        </>
      )}
    </AppShell>
  );
}

function SnapshotBanner({
  savedAt,
  onRefresh,
  running,
}: {
  savedAt: string;
  onRefresh: () => void;
  running: boolean;
}) {
  return (
    <div
      className="card-soft p-5 mb-6 flex items-center gap-4 flex-wrap"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F2ECFE 100%)" }}
    >
      <div className="w-10 h-10 rounded-xl tile-lilac flex items-center justify-center shrink-0">
        <Archive size={16} strokeWidth={1.85} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">Saved snapshot</p>
        <p className="text-[13px] text-ink-muted mt-1">
          You&apos;re viewing data captured {relativeTime(savedAt)} ({new Date(savedAt).toLocaleString()}).
          Store rankings drift — use Refresh to pull a fresh check.
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={running}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      >
        {running ? <Loader2 size={13} className="animate-spin-slow" /> : <RefreshCw size={13} strokeWidth={2} />}
        {running ? "Refreshing…" : "Refresh data"}
      </button>
    </div>
  );
}

function InputForm({
  keyword,
  setKeyword,
  country,
  setCountry,
  store,
  setStore,
  limit,
  setLimit,
  onSubmit,
  running,
}: {
  keyword: string;
  setKeyword: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  store: RankStore;
  setStore: (v: RankStore) => void;
  limit: number;
  setLimit: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  running: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <form onSubmit={onSubmit} className="card-soft p-7 space-y-7">
        <div>
          <label className="eyebrow mb-3 block">Keyword</label>
          <div className="relative">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              maxLength={100}
              placeholder='e.g. "12 testers", "habit tracker", "language learning"'
              className="w-full pl-12 pr-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
            />
          </div>
          <p className="text-[12px] text-ink-faint mt-2">
            Any phrase a user might type into the store&apos;s search bar.
          </p>
        </div>

        <div>
          <label className="eyebrow mb-3 block">Which stores?</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STORE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStore(opt.id)}
                className={`text-left px-4 py-3 rounded-2xl border transition-all ${
                  store === opt.id
                    ? "border-transparent text-white"
                    : "border-line bg-cream-deep text-ink hover:border-ink-faint"
                }`}
                style={store === opt.id ? { backgroundColor: "#2563EB" } : undefined}
              >
                <div className="text-[13px] font-semibold">{opt.label}</div>
                <div className={`text-[11px] mt-0.5 ${store === opt.id ? "text-white/85" : "text-ink-muted"}`}>
                  {opt.hint}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="eyebrow mb-3 block">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink transition-colors appearance-none cursor-pointer"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-ink-faint mt-2">
              Rankings differ per country. &ldquo;Auto&rdquo; resolves your country from your IP, so you see the same Play / App Store results you&rsquo;d see on your own device — pick a specific country to check that market instead.
            </p>
          </div>

          <div>
            <label className="eyebrow mb-3 block">How deep?</label>
            <div className="flex gap-1 bg-cream-deep rounded-full p-1">
              {LIMIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLimit(n)}
                  className={`flex-1 px-4 py-2.5 rounded-full text-[13px] font-medium transition-colors ${
                    limit === n ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Top {n}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-faint mt-2">
              First 10 ranks are the most reliable; 30 is the practical scrape ceiling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-line-soft">
          <button
            type="submit"
            disabled={running || !keyword.trim()}
            className="px-6 py-3.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 size={15} className="animate-spin-slow" />
                Scraping live rankings…
              </>
            ) : (
              <>
                <Hash size={15} strokeWidth={2} />
                Check ranking
                <ArrowRight size={14} />
              </>
            )}
          </button>
          <span className="text-[12px] text-ink-faint">
            {running
              ? "Takes 3–6 seconds — we fetch each top result for full data."
              : "Cached results within an hour are instant."}
          </span>
        </div>
      </form>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <BenefitTile
          tile="tile-blue"
          title="Live rank data"
          desc="Pulled straight from each store's search page — no third-party data layer in between."
        />
        <BenefitTile
          tile="tile-lilac"
          title="Country-aware"
          desc="App rankings shift dramatically by country — we honor your selection per query."
        />
        <BenefitTile
          tile="tile-mint"
          title="History"
          desc="Every check is saved so you can spot rank changes for the same keyword over time."
        />
      </div>
    </div>
  );
}

function BenefitTile({ tile, title, desc }: { tile: string; title: string; desc: string }) {
  return (
    <div className="card-soft p-5">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center mb-4`}>
        <Sparkles size={16} strokeWidth={1.85} />
      </div>
      <p className="text-[14px] font-semibold text-ink mb-1">{title}</p>
      <p className="text-[12px] text-ink-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function Results({
  result,
  insightLoading,
}: {
  result: KeywordRankResult;
  insightLoading: boolean;
}) {
  const playCount = result.apps.filter((a) => a.source === "play").length;
  const iosCount = result.apps.filter((a) => a.source === "ios").length;

  // Computed aggregate signals from the rank list — free, no LLM cost.
  const ratings = result.apps.map((a) => a.rating).filter((r): r is number => typeof r === "number");
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const ratingCounts = result.apps
    .map((a) => a.ratingCount)
    .filter((r): r is number => typeof r === "number")
    .sort((a, b) => a - b);
  const medianRatingCount =
    ratingCounts.length > 0 ? ratingCounts[Math.floor(ratingCounts.length / 2)] : null;
  const titlesWithKeyword = result.apps.filter((a) =>
    a.title?.toLowerCase().includes(result.keyword.toLowerCase())
  ).length;
  const keywordInTitlePct = result.apps.length > 0
    ? Math.round((titlesWithKeyword / result.apps.length) * 100)
    : 0;

  // Composite difficulty score 0-100. Weighted blend of four signals:
  // - median rating count (entrenchment)              40%
  // - keyword-in-title saturation                     30%
  // - top developer concentration (oligopoly signal)  20%
  // - average rating (quality leaders dominate)       10%
  const topDevCount = topDeveloperConcentration(result.apps);
  const difficultyScore = computeDifficulty({
    medianRatingCount: medianRatingCount ?? 0,
    keywordInTitlePct,
    topDevCount,
    avgRating: avgRating ?? 3.5,
    appsAnalyzed: result.apps.length,
  });
  const difficultyTier =
    difficultyScore >= 70 ? "high" : difficultyScore >= 40 ? "moderate" : "low";

  // Rating distribution buckets for the chart.
  const ratingBuckets = bucketize(ratings, [
    { label: "4.7+", min: 4.7, max: 5.01 },
    { label: "4.4–4.7", min: 4.4, max: 4.7 },
    { label: "4.0–4.4", min: 4.0, max: 4.4 },
    { label: "< 4.0", min: 0, max: 4.0 },
  ]);

  // Category share for the donut.
  const categoryShare = aggregateBy(result.apps, (a) => a.genre).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Summary strip */}
      <div className="card-soft p-5 flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center shrink-0">
          <Hash size={16} strokeWidth={1.85} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow">{storeLabel(result.store)} · {result.country.toUpperCase()}</p>
          <p className="text-[14px] text-ink mt-1">
            <strong className="font-semibold">{result.apps.length}</strong> apps ranked
            {result.store === "both" && ` (${playCount} Play, ${iosCount} App Store)`}
          </p>
        </div>
        <p className="text-[12px] text-ink-faint shrink-0 inline-flex items-center gap-1.5">
          <Clock size={11} />
          {result.fromCache ? "Cached " : "Scraped "}
          {relativeTime(result.cachedAt)}
        </p>
      </div>

      {/* Keyword difficulty + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3">
        <DifficultyCard score={difficultyScore} tier={difficultyTier} />
        <div className="grid grid-cols-2 gap-3">
          <SignalTile
            icon={<Star size={14} fill="#FBBF24" stroke="#FBBF24" />}
            label="Avg rating"
            value={avgRating !== null ? avgRating.toFixed(2) : "—"}
            sub={`${ratings.length} of ${result.apps.length} apps`}
          />
          <SignalTile
            icon={<TrendingUp size={14} className="text-ink-muted" />}
            label="Median ratings"
            value={medianRatingCount !== null ? fmtCompact(medianRatingCount) : "—"}
            sub="middle of pack"
          />
          <SignalTile
            icon={<Target size={14} className="text-ink-muted" />}
            label="Keyword in title"
            value={`${keywordInTitlePct}%`}
            sub={`${titlesWithKeyword} of ${result.apps.length}`}
          />
          <SignalTile
            icon={<Tag size={14} className="text-ink-muted" />}
            label="Top competitor"
            value={topCompetitor(result.apps) ?? "—"}
            sub="#1 for this keyword"
            truncate
          />
        </div>
      </div>

      {/* Charts row — rating distribution + category share + rank-vs-ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <RatingDistributionChart buckets={ratingBuckets} total={ratings.length} />
        <CategoryShareChart slices={categoryShare} total={result.apps.length} />
        <RankVsRatingsChart apps={result.apps} />
      </div>

      {/* LLM Insight card */}
      <InsightCard insight={result.insight} loading={insightLoading} />

      {/* Rank table */}
      <div className="card-soft overflow-hidden">
        <header className="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Ranking</h2>
          <p className="text-[12px] text-ink-faint">
            Click a row to expand · order is the store&apos;s ranking for &ldquo;{result.keyword}&rdquo;
          </p>
        </header>
        <ul className="divide-y divide-line-soft">
          {result.apps.map((app) => (
            <RankRow
              key={`${app.source}-${app.rank}-${app.appId ?? app.url}`}
              app={app}
              keyword={result.keyword}
            />
          ))}
        </ul>
      </div>

      <p className="text-[12px] text-ink-faint">
        Heads up — store rankings can shift hourly, and you may see different results from
        a logged-in browser session due to personalization. This page shows the neutral,
        anonymous ranking pulled from each store&apos;s search page.
      </p>
    </div>
  );
}

function SignalTile({
  icon,
  label,
  value,
  sub,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  truncate?: boolean;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">{label}</p>
      </div>
      <p
        className={`text-[20px] font-semibold text-ink tabular-nums ${truncate ? "truncate" : ""}`}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-ink-faint mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function InsightCard({
  insight,
  loading,
}: {
  insight: KeywordInsight | undefined;
  loading: boolean;
}) {
  if (!insight && !loading) return null;

  const levelStyle =
    insight?.competitionLevel === "high"
      ? { bg: "bg-warn/10", text: "text-warn", border: "border-warn/30" }
      : insight?.competitionLevel === "moderate"
        ? { bg: "bg-gold/10", text: "text-gold", border: "border-gold/30" }
        : { bg: "bg-green/10", text: "text-green", border: "border-green/30" };

  return (
    <div
      className="card-soft p-6"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FDF2FA 100%)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-xl tile-lilac flex items-center justify-center">
          <Lightbulb size={16} strokeWidth={1.85} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow">Insight</p>
          {loading ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 size={13} className="animate-spin-slow text-ink-faint" />
              <p className="text-[13px] text-ink-muted">Analysing the ranking…</p>
            </div>
          ) : insight ? (
            <p className="text-[15px] font-medium text-ink mt-1 leading-snug">{insight.summary}</p>
          ) : null}
        </div>
        {insight && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}
          >
            {insight.competitionLevel} competition
          </span>
        )}
      </div>

      {insight && (
        <>
          <p className="text-[12px] text-ink-muted mb-5 pl-13">{insight.competitionRationale}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="eyebrow mb-3">Observations</p>
              <ul className="space-y-2">
                {insight.observations.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink leading-snug">
                    <span className="text-accent mt-1 shrink-0">•</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              {insight.titlePattern && (
                <div>
                  <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
                    <Hash size={11} />
                    Title pattern
                  </p>
                  <p className="text-[13px] text-ink leading-snug">{insight.titlePattern}</p>
                </div>
              )}
              {insight.opportunity && (
                <div>
                  <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
                    <Target size={11} />
                    Opportunity
                  </p>
                  <p className="text-[13px] text-ink leading-snug">{insight.opportunity}</p>
                </div>
              )}
              {!insight.titlePattern && !insight.opportunity && (
                <div className="flex items-start gap-2 text-[12px] text-ink-faint">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>No clear title pattern or opportunity gap surfaced — the SERP is heterogeneous.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function topCompetitor(apps: RankedApp[]): string | null {
  if (apps.length === 0) return null;
  const top = apps.find((a) => a.rank === 1);
  return top?.title ?? apps[0].title ?? null;
}

function topDeveloperConcentration(apps: RankedApp[]): number {
  const counts = new Map<string, number>();
  for (const a of apps) {
    if (!a.developer) continue;
    counts.set(a.developer, (counts.get(a.developer) ?? 0) + 1);
  }
  let max = 0;
  for (const n of counts.values()) if (n > max) max = n;
  return max;
}

// Logarithmic normalisation. Maps a value in [min, max] to [0, 1] on a log
// scale so rating-count differences at the low end (1k vs 10k = big deal)
// matter more than at the high end (500k vs 1M = same tier).
function logNormalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  const logVal = Math.log10(value);
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return (logVal - logMin) / (logMax - logMin);
}

function computeDifficulty(args: {
  medianRatingCount: number;
  keywordInTitlePct: number;
  topDevCount: number;
  avgRating: number;
  appsAnalyzed: number;
}): number {
  if (args.appsAnalyzed === 0) return 0;
  // Entrenchment: median rating count between 1k (easy) and 1M (very hard).
  const entrenchment = logNormalize(args.medianRatingCount || 1, 1_000, 1_000_000);
  // Saturation: what % of titles already contain this keyword.
  const saturation = Math.min(1, args.keywordInTitlePct / 100);
  // Concentration: max apps per developer in the top results. 1 = healthy,
  // 5+ = single publisher dominates.
  const concentration = Math.min(1, Math.max(0, args.topDevCount - 1) / 4);
  // Quality bar: how high is the avg rating across the SERP (3.5 baseline → 5.0 ceiling).
  const quality = Math.max(0, Math.min(1, (args.avgRating - 3.5) / 1.5));

  const score =
    0.4 * entrenchment +
    0.3 * saturation +
    0.2 * concentration +
    0.1 * quality;
  return Math.round(score * 100);
}

function bucketize(
  values: number[],
  ranges: { label: string; min: number; max: number }[]
): { label: string; count: number; pct: number }[] {
  return ranges.map((r) => {
    const count = values.filter((v) => v >= r.min && v < r.max).length;
    const pct = values.length > 0 ? count / values.length : 0;
    return { label: r.label, count, pct };
  });
}

function aggregateBy<T>(items: T[], keyFn: (t: T) => string | undefined): { label: string; count: number; pct: number }[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    total++;
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, pct: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

// ─── Difficulty gauge ───────────────────────────────────────────────────────

function DifficultyCard({
  score,
  tier,
}: {
  score: number;
  tier: "low" | "moderate" | "high";
}) {
  const color = tier === "high" ? "#DC2626" : tier === "moderate" ? "#D97706" : "#16A34A";
  const tierLabel = tier === "high" ? "Hard" : tier === "moderate" ? "Moderate" : "Easy";
  const tierCopy =
    tier === "high"
      ? "Entrenched competition. Long-tail or differentiated positioning advised."
      : tier === "moderate"
        ? "Competitive but breakable with strong positioning and reviews."
        : "Low competition. Solid opportunity for a new entrant.";

  const radius = 56;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

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
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint mt-1">
            / 100
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">Difficulty</p>
        <p className="text-[18px] font-semibold text-ink mt-1" style={{ color }}>
          {tierLabel}
        </p>
        <p className="text-[12px] text-ink-muted leading-snug mt-1.5">{tierCopy}</p>
      </div>
    </div>
  );
}

// ─── Rating distribution bar chart ────────────────────────────────────────

function RatingDistributionChart({
  buckets,
  total,
}: {
  buckets: { label: string; count: number; pct: number }[];
  total: number;
}) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <Star size={12} fill="#FBBF24" stroke="#FBBF24" />
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
          Rating distribution
        </p>
      </div>
      {total === 0 ? (
        <p className="text-[12px] text-ink-faint">No rating data.</p>
      ) : (
        <ul className="space-y-2.5">
          {buckets.map((b) => (
            <li key={b.label} className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-ink-muted tabular-nums w-[52px] shrink-0">
                {b.label}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-cream-deep overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(b.count / max) * 100}%`, backgroundColor: "#2563EB" }}
                />
              </div>
              <span className="text-[11px] text-ink-faint tabular-nums w-8 text-right shrink-0">
                {b.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Category share donut ─────────────────────────────────────────────────

function CategoryShareChart({
  slices,
  total,
}: {
  slices: { label: string; count: number; pct: number }[];
  total: number;
}) {
  const palette = ["#2563EB", "#7C3AED", "#16A34A", "#F59E0B", "#9CA3AF"];
  const radius = 36;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius;
  let cumPct = 0;

  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <Tag size={12} className="text-ink-muted" />
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
          Category mix
        </p>
      </div>
      {slices.length === 0 ? (
        <p className="text-[12px] text-ink-faint">No category data.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={14} />
              {slices.map((s, i) => {
                const dash = s.pct * circumference;
                const offset = cumPct * circumference;
                cumPct += s.pct;
                return (
                  <circle
                    key={s.label}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={palette[i % palette.length]}
                    strokeWidth={14}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[18px] font-bold tabular-nums text-ink">{total}</span>
            </div>
          </div>
          <ul className="flex-1 min-w-0 space-y-1.5">
            {slices.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2 text-[11px]">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: palette[i % palette.length] }}
                />
                <span className="text-ink truncate flex-1">{s.label}</span>
                <span className="text-ink-faint tabular-nums shrink-0">
                  {s.count} · {Math.round(s.pct * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Rank vs ratings scatter ──────────────────────────────────────────────
// Shows how dominant the top positions are: each app plotted by (rank, rating
// count) on a log scale. Helps visualise whether the top results have huge
// install bases (= hard to dethrone) or are roughly even (= more contestable).

function RankVsRatingsChart({ apps }: { apps: RankedApp[] }) {
  const points = apps
    .map((a) => ({ rank: a.rank, count: a.ratingCount }))
    .filter((p): p is { rank: number; count: number } => typeof p.count === "number" && p.count > 0);

  const w = 240;
  const h = 140;
  const padding = { top: 12, right: 12, bottom: 22, left: 32 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const maxRank = Math.max(...apps.map((a) => a.rank), 10);
  const maxLog = points.length > 0 ? Math.log10(Math.max(...points.map((p) => p.count))) : 5;

  const xFor = (rank: number) =>
    padding.left + ((rank - 1) / Math.max(1, maxRank - 1)) * plotW;
  const yFor = (count: number) =>
    padding.top + plotH - (Math.log10(count) / Math.max(1, maxLog)) * plotH;

  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <TrendingUp size={12} className="text-ink-muted" />
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
          Rank vs ratings
        </p>
      </div>
      {points.length === 0 ? (
        <p className="text-[12px] text-ink-faint">Not enough rating data.</p>
      ) : (
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
          {/* y-axis log gridlines: 100, 1k, 10k, 100k, 1M */}
          {[2, 3, 4, 5, 6].map((p) => {
            const y = padding.top + plotH - (p / Math.max(1, maxLog)) * plotH;
            if (y < padding.top || y > h - padding.bottom) return null;
            return (
              <g key={p}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={w - padding.right}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth={1}
                />
                <text x={padding.left - 4} y={y + 3} fontSize="9" fill="#9CA3AF" textAnchor="end">
                  {p === 2 ? "100" : p === 3 ? "1k" : p === 4 ? "10k" : p === 5 ? "100k" : "1M"}
                </text>
              </g>
            );
          })}
          {/* x-axis labels */}
          {[1, Math.ceil(maxRank / 2), maxRank].map((r) => (
            <text
              key={r}
              x={xFor(r)}
              y={h - 6}
              fontSize="9"
              fill="#9CA3AF"
              textAnchor="middle"
            >
              #{r}
            </text>
          ))}
          {/* dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={xFor(p.rank)}
              cy={yFor(p.count)}
              r={4}
              fill="#2563EB"
              fillOpacity={0.7}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

interface AppDetail {
  source: "play" | "ios";
  title?: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc?: string;
  genre?: string;
  developer?: string;
  iconUrl?: string;
}

function RankRow({ app, keyword }: { app: RankedApp; keyword: string }) {
  const [iconBroken, setIconBroken] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const StoreIcon = app.source === "ios" ? Apple : app.source === "play" ? Smartphone : Globe;
  const iconSrc = proxiedIcon(app.iconUrl);
  const showIcon = iconSrc && !iconBroken;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !detail && !loading) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: app.url }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as AppDetail;
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load full listing");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <li className="border-b border-line-soft last:border-b-0">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-cream-deep/50 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="w-10 shrink-0 text-center">
          <span
            className="text-[20px] font-bold tabular-nums leading-none"
            style={{ color: app.rank <= 3 ? "#0B3D7A" : "#9CA3AF" }}
          >
            {app.rank}
          </span>
        </div>

        {showIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconSrc}
            alt={app.title ?? "App icon"}
            onError={() => setIconBroken(true)}
            className="w-11 h-11 rounded-xl shrink-0 bg-cream-deep object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl tile-blue flex items-center justify-center shrink-0 font-bold text-[15px]">
            {(app.title ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-ink truncate">{app.title ?? "Unknown title"}</p>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
              <StoreIcon size={10} strokeWidth={1.85} />
              {app.source === "ios" ? "App Store" : "Play Store"}
            </span>
            {app.title && keyword && app.title.toLowerCase().includes(keyword.toLowerCase()) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent uppercase tracking-[0.1em]">
                kw in title
              </span>
            )}
          </div>
          <p className="text-[12px] text-ink-faint truncate mt-0.5">
            {app.developer ?? ""}{app.developer && app.genre ? " · " : ""}{app.genre ?? ""}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[13px] text-ink shrink-0 min-w-[70px] justify-end">
          {app.rating !== undefined ? (
            <>
              <Star size={12} fill="#FBBF24" stroke="#FBBF24" />
              <span className="font-semibold tabular-nums">{app.rating.toFixed(1)}</span>
            </>
          ) : (
            <span className="text-ink-faint text-[12px]">—</span>
          )}
        </div>
        <div className="hidden md:block text-[12px] text-ink-muted shrink-0 min-w-[80px] text-right tabular-nums">
          {app.ratingCount !== undefined ? `${fmtCompact(app.ratingCount)} ratings` : "—"}
        </div>

        <span
          onClick={(e) => {
            e.stopPropagation();
            window.open(app.url, "_blank", "noopener,noreferrer");
          }}
          className="shrink-0 p-2 rounded-lg text-ink-faint hover:text-ink hover:bg-cream-deep transition-colors cursor-pointer"
          title="Open listing"
        >
          <ExternalLink size={14} />
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 pt-1 bg-cream-deep/30 animate-fade-in">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-[13px] text-ink-muted">
              <Loader2 size={14} className="animate-spin-slow" />
              Loading full listing…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 py-4 text-[13px] text-warn">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {detail && !loading && (
            <AppDetailPanel detail={detail} keyword={keyword} platform={app.source} price={app.price} />
          )}
        </div>
      )}
    </li>
  );
}

function AppDetailPanel({
  detail,
  keyword,
  platform,
  price,
}: {
  detail: AppDetail;
  keyword: string;
  platform: "play" | "ios";
  price: string | undefined;
}) {
  const [descExpanded, setDescExpanded] = useState(false);
  const kw = keyword.toLowerCase();
  const titleHits = countOccurrences(detail.title, kw);
  const shortHits = countOccurrences(detail.shortDesc ?? detail.subtitle, kw);
  const fullHits = countOccurrences(detail.fullDesc, kw);

  const descPreviewLen = 600;
  const fullDescToShow = detail.fullDesc
    ? descExpanded || detail.fullDesc.length <= descPreviewLen
      ? detail.fullDesc
      : detail.fullDesc.slice(0, descPreviewLen).trimEnd() + "…"
    : "";

  return (
    <div className="space-y-5 ml-14">
      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-muted">
        {price && (
          <span className="inline-flex items-center gap-1">
            <DollarSign size={11} />
            {price}
          </span>
        )}
        {detail.genre && (
          <span className="inline-flex items-center gap-1">
            <Tag size={11} />
            {detail.genre}
          </span>
        )}
        {detail.developer && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} />
            {detail.developer}
          </span>
        )}
      </div>

      {/* Keyword placement breakdown */}
      <div>
        <p className="eyebrow mb-2">Keyword "{keyword}" placement</p>
        <div className="flex flex-wrap gap-2">
          <KeywordHit label="Title" hits={titleHits} />
          <KeywordHit
            label={platform === "play" ? "Short desc" : "Subtitle"}
            hits={shortHits}
          />
          <KeywordHit label="Full description" hits={fullHits} />
        </div>
      </div>

      {/* Title + short desc */}
      {detail.title && (
        <div>
          <p className="eyebrow mb-1.5 inline-flex items-baseline gap-2">
            Title
            <span className="text-[10px] text-ink-faint normal-case tracking-normal">
              {detail.title.length}/30
            </span>
          </p>
          <p className="text-[14px] text-ink">{highlightKeyword(detail.title, kw)}</p>
        </div>
      )}

      {(detail.shortDesc || detail.subtitle) && (
        <div>
          <p className="eyebrow mb-1.5 inline-flex items-baseline gap-2">
            {detail.shortDesc ? "Short description" : "Subtitle"}
            <span className="text-[10px] text-ink-faint normal-case tracking-normal">
              {(detail.shortDesc ?? detail.subtitle ?? "").length}/
              {detail.shortDesc ? "80" : "30"}
            </span>
          </p>
          <p className="text-[13px] text-ink leading-snug">
            {highlightKeyword(detail.shortDesc ?? detail.subtitle ?? "", kw)}
          </p>
        </div>
      )}

      {/* Full description */}
      {detail.fullDesc && (
        <div>
          <p className="eyebrow mb-1.5 inline-flex items-baseline gap-2">
            Full description
            <span className="text-[10px] text-ink-faint normal-case tracking-normal">
              {detail.fullDesc.length} chars
            </span>
          </p>
          <div className="card-soft p-4 max-h-96 overflow-y-auto">
            <p className="text-[13px] text-ink whitespace-pre-wrap leading-relaxed">
              {highlightKeyword(fullDescToShow, kw)}
            </p>
          </div>
          {detail.fullDesc.length > descPreviewLen && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className="mt-2 text-[12px] text-accent hover:underline"
            >
              {descExpanded ? "Show less" : `Show full description (${detail.fullDesc.length - descPreviewLen}+ more chars)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function KeywordHit({ label, hits }: { label: string; hits: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
        hits > 0
          ? "bg-green/10 text-green border-green/30"
          : "bg-cream-deep text-ink-faint border-line"
      }`}
    >
      {label}
      <span className="tabular-nums font-bold">{hits}×</span>
    </span>
  );
}

function countOccurrences(haystack: string | undefined, needle: string): number {
  if (!haystack || !needle) return 0;
  let count = 0;
  const lower = haystack.toLowerCase();
  let i = 0;
  while ((i = lower.indexOf(needle, i)) !== -1) {
    count++;
    i += needle.length;
  }
  return count;
}

function highlightKeyword(text: string, keyword: string): React.ReactNode {
  if (!text || !keyword) return text;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let i = 0;
  while ((i = lower.indexOf(keyword, lastIdx)) !== -1) {
    if (i > lastIdx) parts.push(text.slice(lastIdx, i));
    parts.push(
      <mark key={i} className="bg-accent/20 text-accent rounded px-0.5">
        {text.slice(i, i + keyword.length)}
      </mark>
    );
    lastIdx = i + keyword.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length > 0 ? parts : text;
}

function RecentRanks({
  records,
  onDelete,
}: {
  records: KeywordRankRecord[];
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
          <h2
            className="text-[22px] font-semibold tracking-[-0.01em]"
            style={{ color: "#0B3D7A" }}
          >
            Your recent rank checks
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.slice(0, 9).map((r) => {
          const replayHref =
            `/keywords?keyword=${encodeURIComponent(r.keyword)}` +
            `&country=${r.country}&lang=${r.lang}&store=${r.store}&limit=${r.limit}`;
          const storeTile =
            r.store === "play" ? "tile-mint" : r.store === "ios" ? "tile-lilac" : "tile-blue";
          return (
            <div key={r.id} className="card-soft p-5 group relative">
              <Link href={replayHref} className="block">
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${storeTile}`}
                  >
                    {storeLabel(r.store)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
                    {r.country.toUpperCase()}
                  </span>
                </div>

                <p className="text-[15px] font-semibold text-ink truncate">{r.keyword}</p>
                <p className="text-[11px] text-ink-muted truncate mt-0.5">
                  Top {r.limit} · {r.topResultsCount} returned
                </p>
                {r.topResultTitle && (
                  <p className="text-[11px] text-ink-faint truncate mt-1">
                    #1 was &ldquo;{r.topResultTitle}&rdquo;
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                  <span>Re-run</span>
                  <span className="tabular-nums">{relativeTime(r.createdAt)}</span>
                </div>
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(r.id);
                }}
                aria-label="Delete rank check"
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

// --- helpers --------------------------------------------------------------

function storeLabel(s: RankStore): string {
  if (s === "play") return "Play Store";
  if (s === "ios") return "App Store";
  return "Both stores";
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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
