"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { proxiedIcon } from "@/lib/icon-proxy";
import { useToast } from "@/components/shared/ToastProvider";
import type { KeywordRankRecord } from "@/lib/types";
import type { KeywordRankResult, RankStore, RankedApp } from "@/lib/keyword-rank";
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
} from "lucide-react";

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
  { id: "ios", label: "App Store", hint: "iTunes Search ranking" },
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
  const [country, setCountry] = useState("us");
  const [lang, setLang] = useState("en");
  const [store, setStore] = useState<RankStore>("both");
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState<KeywordRankResult | null>(null);
  const [running, setRunning] = useState(false);

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
      try {
        const res = await fetch("/api/keyword-rank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as KeywordRankResult;
        setResult(data);

        // Persist summary so it shows up on the dashboard + recent list.
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
        };
        recordKeywordRank(record);
      } catch (err) {
        push(err instanceof Error ? err.message : "Rank check failed");
      } finally {
        setRunning(false);
      }
    },
    [push, recordKeywordRank]
  );

  // Deep-link replay: /keywords?keyword=...&country=...&store=... triggers
  // an auto-run once the user is hydrated.
  const replayedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const kw = search.get("keyword");
    if (!kw) return;
    const c = (search.get("country") ?? "us").toLowerCase();
    const l = (search.get("lang") ?? "en").toLowerCase();
    const s = (search.get("store") ?? "both") as RankStore;
    const lim = Number(search.get("limit") ?? 10);
    const key = [kw.trim().toLowerCase(), c, l, s, lim].join("|");
    if (replayedRef.current === key) return;
    replayedRef.current = key;
    setKeyword(kw);
    setCountry(c);
    setLang(l);
    setStore(s);
    setLimit(LIMIT_OPTIONS.includes(lim) ? lim : 10);
    runCheck({ keyword: kw, country: c, lang: l, store: s, limit: lim });
  }, [search, user, runCheck]);

  if (authLoading || !user) return null;

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (running || !keyword.trim()) return;
    await runCheck({ keyword, country, lang, store, limit });
  }

  function handleReset() {
    setResult(null);
  }

  return (
    <AppShell
      eyebrow="Tools · Keyword Research"
      title={result ? `Top ${result.apps.length} for "${result.keyword}"` : "What ranks for this keyword?"}
      description={
        result
          ? `${storeLabel(result.store)} · ${result.country.toUpperCase()} · pulled ${relativeTime(result.cachedAt)}${result.fromCache ? " (cached)" : ""}.`
          : "Type a keyword and we'll show you the live ranking on the App Store and Google Play. Use it to see where your app — or your competitors — surface today."
      }
      actions={
        result ? (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            New rank check
          </button>
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
        <Results result={result} />
      )}
    </AppShell>
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
              Rankings differ per country — pick the market you care about.
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

function Results({ result }: { result: KeywordRankResult }) {
  const playCount = result.apps.filter((a) => a.source === "play").length;
  const iosCount = result.apps.filter((a) => a.source === "ios").length;

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

      {/* Rank table */}
      <div className="card-soft overflow-hidden">
        <header className="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Ranking</h2>
          <p className="text-[12px] text-ink-faint">
            Order is the store&apos;s search ranking for &ldquo;{result.keyword}&rdquo;
          </p>
        </header>
        <ul className="divide-y divide-line-soft">
          {result.apps.map((app) => (
            <RankRow key={`${app.source}-${app.rank}-${app.appId ?? app.url}`} app={app} />
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

function RankRow({ app }: { app: RankedApp }) {
  const [iconBroken, setIconBroken] = useState(false);
  const StoreIcon = app.source === "ios" ? Apple : app.source === "play" ? Smartphone : Globe;
  const iconSrc = proxiedIcon(app.iconUrl);
  const showIcon = iconSrc && !iconBroken;

  return (
    <li className="flex items-center gap-4 px-6 py-4 hover:bg-cream-deep/50 transition-colors">
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
          alt=""
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

      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 p-2 rounded-lg text-ink-faint hover:text-ink hover:bg-cream-deep transition-colors"
        title="Open listing"
      >
        <ExternalLink size={14} />
      </a>
    </li>
  );
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
