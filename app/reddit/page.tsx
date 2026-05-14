"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import type {
  RedditAnalysisPayload,
  RedditAnalysisRecord,
  RedditPostSummary,
  RedditSelectedPost,
} from "@/lib/types";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  ArrowBigUp,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

// Deterministic id from the idea text so re-running the same idea updates
// the existing record. djb2 hash of the lowercased, whitespace-collapsed idea.
function redditAnalysisId(idea: string): string {
  const key = idea.trim().toLowerCase().replace(/\s+/g, " ");
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return `rd_${(h >>> 0).toString(36)}`;
}

const EXAMPLE_IDEAS = [
  "A habit tracker for people with ADHD that doesn't shame you for missing days.",
  "An app that scans your fridge contents and suggests recipes from what you actually have.",
  "Mental-load tracker for couples — quietly logs every household task and shows who's actually doing more.",
];

const TAG_META = {
  request: {
    label: "Request",
    icon: HelpCircle,
    tile: "tile-blue",
    blurb: "Direct ask for an app like this",
  },
  complaint: {
    label: "Complaint",
    icon: AlertCircle,
    tile: "tile-rose",
    blurb: "Unhappy with what exists today",
  },
  discussion: {
    label: "Discussion",
    icon: MessageSquare,
    tile: "tile-cream",
    blurb: "Adjacent conversation worth reading",
  },
} as const;

// Suspense boundary around the inner component so useSearchParams() doesn't
// bail out static generation at build time. Same pattern as /keywords.
export default function RedditPage() {
  return (
    <Suspense fallback={null}>
      <RedditPageInner />
    </Suspense>
  );
}

function RedditPageInner() {
  const {
    user,
    loading: authLoading,
    redditAnalyses,
    recordRedditAnalysis,
    removeRedditAnalysis,
  } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const { push } = useToast();

  const [idea, setIdea] = useState("");
  const [result, setResult] = useState<RedditAnalysisPayload | null>(null);
  const [running, setRunning] = useState(false);
  // When a saved snapshot is loaded from history, we remember when it was
  // captured so the UI can show a "Snapshot from …" banner + Refresh.
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth?next=%2Freddit");
  }, [user, authLoading, router]);

  const runAnalysis = useCallback(
    async (rawIdea: string) => {
      const trimmed = rawIdea.trim();
      if (trimmed.length < 20) return;
      setRunning(true);
      setResult(null);
      setSnapshotAt(null);
      try {
        const res = await fetch("/api/reddit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: trimmed }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as RedditAnalysisPayload;
        setResult(data);

        const record: RedditAnalysisRecord = {
          id: redditAnalysisId(trimmed),
          idea: trimmed,
          ideaPreview: trimmed.length > 80 ? trimmed.slice(0, 80).trimEnd() + "…" : trimmed,
          demandScore: data.rank.demandScore,
          demandLabel: data.rank.demandLabel,
          postCount: data.rank.selectedPosts.length,
          createdAt: data.createdAt,
          snapshot: data,
        };
        recordRedditAnalysis(record);
      } catch (err) {
        push(err instanceof Error ? err.message : "Reddit analysis failed");
      } finally {
        setRunning(false);
      }
    },
    [push, recordRedditAnalysis]
  );

  // Deep-link replay: /reddit?id=rd_abc loads the saved snapshot.
  useEffect(() => {
    if (!user || authLoading) return;
    const id = search.get("id");
    if (!id) return;
    const saved = redditAnalyses.find((r) => r.id === id);
    if (saved?.snapshot) {
      // URL-driven state sync — eslint-disable warranted.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdea(saved.idea);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(saved.snapshot);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSnapshotAt(saved.createdAt);
    }
  }, [search, user, authLoading, redditAnalyses]);

  if (authLoading || !user) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (running || idea.trim().length < 20) return;
    runAnalysis(idea);
  }

  function handleReset() {
    setResult(null);
    setSnapshotAt(null);
  }

  function handleRefresh() {
    if (running || !result) return;
    runAnalysis(result.idea);
  }

  // When the result is in, the AppShell title becomes the bare question — the
  // verdict sits in its own row beneath so it can carry weight without being
  // the page title.
  const headerTitle = result
    ? `What Reddit says about your idea`
    : "Will people actually want this?";

  const headerDescription = result
    ? snapshotAt
      ? `Saved snapshot · ${relativeTime(snapshotAt)} · Reddit conversations evolve fast.`
      : undefined
    : "Paste an app idea. We'll search Reddit for posts where people are asking for, complaining about, or discussing this kind of app — so you can see real demand before you build.";

  return (
    <AppShell
      eyebrow="Tools · Reddit Demand"
      title={headerTitle}
      description={headerDescription}
      actions={
        result ? (
          <div className="flex items-center gap-2">
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
              {running ? "Refreshing…" : "Refresh"}
            </button>
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
          <InputForm
            idea={idea}
            setIdea={setIdea}
            onSubmit={handleSubmit}
            running={running}
          />
          {redditAnalyses.length > 0 && (
            <RecentAnalyses records={redditAnalyses} onDelete={removeRedditAnalysis} />
          )}
        </>
      ) : (
        <ResultView result={result} snapshotAt={snapshotAt} />
      )}
    </AppShell>
  );
}

// --- input ---------------------------------------------------------------

function InputForm({
  idea,
  setIdea,
  onSubmit,
  running,
}: {
  idea: string;
  setIdea: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  running: boolean;
}) {
  const len = idea.trim().length;
  const tooShort = len > 0 && len < 20;
  return (
    <div className="max-w-3xl">
      <form onSubmit={onSubmit} className="card-soft p-7 space-y-6">
        <div>
          <label className="eyebrow mb-3 block">Your app idea</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. A budgeting app for couples that splits shared and personal spending automatically from one bank feed."
            rows={5}
            maxLength={2000}
            className="w-full px-5 py-4 rounded-2xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors resize-y leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <p className={`text-[12px] ${tooShort ? "text-warn" : "text-ink-faint"}`}>
              {tooShort
                ? `${20 - len} more characters — give us a real sentence.`
                : "Describe the problem, who it's for, and what's different. More detail = sharper search."}
            </p>
            <p className="text-[12px] text-ink-faint tabular-nums">{len} / 2000</p>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3">Or try one of these</p>
          <div className="space-y-2">
            {EXAMPLE_IDEAS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setIdea(ex)}
                className="block w-full text-left px-4 py-3 rounded-2xl border border-line bg-white hover:border-ink-faint hover:bg-cream-deep transition-colors text-[13px] text-ink-muted"
              >
                <span className="text-ink-faint mr-1.5">›</span>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-line-soft">
          <button
            type="submit"
            disabled={running || len < 20}
            className="px-6 py-3.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 size={15} className="animate-spin-slow" />
                Reading Reddit…
              </>
            ) : (
              <>
                <Sparkles size={15} strokeWidth={2} />
                Check Reddit demand
                <ArrowRight size={14} />
              </>
            )}
          </button>
          <span className="text-[12px] text-ink-faint">
            {running
              ? "Takes 10–25 seconds — we fan out 8–12 searches and rank what we find."
              : "Free. No login data sent to Reddit; only your idea goes to the search planner."}
          </span>
        </div>
      </form>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <BenefitTile
          tile="tile-blue"
          icon={Lightbulb}
          title="Plain-idea input"
          desc="Skip the keyword guesswork — we translate your one-paragraph idea into the queries Reddit users actually type."
        />
        <BenefitTile
          tile="tile-rose"
          icon={Users}
          title="Demand, not vanity"
          desc="We surface posts where people ask for this app, complain about alternatives, or wish they had it — not random mentions."
        />
        <BenefitTile
          tile="tile-mint"
          icon={TrendingUp}
          title="One honest score"
          desc="A 0–100 demand score calibrated against post engagement, recency, and how directly each post matches your idea."
        />
      </div>
    </div>
  );
}

function BenefitTile({
  tile,
  icon: Icon,
  title,
  desc,
}: {
  tile: string;
  icon: typeof Lightbulb;
  title: string;
  desc: string;
}) {
  return (
    <div className="card-soft p-5">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center mb-4`}>
        <Icon size={16} strokeWidth={1.85} />
      </div>
      <p className="text-[14px] font-semibold text-ink mb-1">{title}</p>
      <p className="text-[12px] text-ink-muted leading-relaxed">{desc}</p>
    </div>
  );
}

// --- result --------------------------------------------------------------
//
// This view is intentionally Reddit-shaped, not report-shaped. The verdict
// sits in one quiet line above a filterable feed of posts. The feed itself
// looks and reads like a Reddit timeline: votes on the left rail, subreddit
// and timestamp inline, body excerpt below, a quiet inline note for why this
// post matters, and an "Open on Reddit" footer link.

type TagFilter = "all" | "request" | "complaint" | "discussion";

function ResultView({
  result,
  snapshotAt,
}: {
  result: RedditAnalysisPayload;
  snapshotAt: string | null;
}) {
  void snapshotAt; // shown in AppShell description instead

  const postById = useMemo(
    () => new Map(result.posts.map((p) => [p.id, p])),
    [result.posts]
  );
  const selected = useMemo(
    () =>
      result.rank.selectedPosts
        .map((s) => ({ selection: s, post: postById.get(s.id) }))
        .filter(
          (x): x is { selection: RedditSelectedPost; post: RedditPostSummary } =>
            !!x.post
        ),
    [result.rank.selectedPosts, postById]
  );

  const counts = useMemo(() => {
    const c = { all: selected.length, request: 0, complaint: 0, discussion: 0 };
    selected.forEach((x) => {
      c[x.selection.tag] += 1;
    });
    return c;
  }, [selected]);

  const [filter, setFilter] = useState<TagFilter>("all");
  const visible =
    filter === "all" ? selected : selected.filter((x) => x.selection.tag === filter);

  return (
    <div className="max-w-3xl space-y-6">
      <Verdict result={result} />

      <FilterPills counts={counts} active={filter} onChange={setFilter} />

      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map(({ selection, post }) => (
            <RedditPostTile
              key={post.id}
              post={post}
              insight={selection.insight}
              tag={selection.tag}
            />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-ink-muted py-10 text-center">
          No {filter !== "all" && filter} posts in this view.
        </p>
      )}

      <SearchedFootnote result={result} />
    </div>
  );
}

// One quiet line — score as a chip, label inline, brief as continuation text.
function Verdict({ result }: { result: RedditAnalysisPayload }) {
  const tone = scoreTone(result.rank.demandScore);
  return (
    <div className="py-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="inline-flex items-center justify-center min-w-[42px] h-[26px] rounded-md text-[14px] font-bold tabular-nums px-2"
          style={{ backgroundColor: tone.bg, color: tone.ink }}
        >
          {result.rank.demandScore}
        </span>
        <span
          className="text-[17px] font-semibold"
          style={{ color: tone.ink }}
        >
          {result.rank.demandLabel} demand
        </span>
        <span className="text-[14px] text-ink-muted">
          · {result.rank.selectedPosts.length} relevant posts across {countDistinctSubs(result)} subreddits
        </span>
      </div>
      <p className="text-[14px] text-ink leading-relaxed mt-3 max-w-2xl">
        {result.rank.brief}
      </p>
    </div>
  );
}

function FilterPills({
  counts,
  active,
  onChange,
}: {
  counts: { all: number; request: number; complaint: number; discussion: number };
  active: TagFilter;
  onChange: (f: TagFilter) => void;
}) {
  const pills: { id: TagFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "request", label: "Asking for it", count: counts.request },
    { id: "complaint", label: "Complaining", count: counts.complaint },
    { id: "discussion", label: "Talking about it", count: counts.discussion },
  ];
  return (
    <div className="flex flex-wrap gap-2 sticky top-[80px] z-10 bg-white py-2 -mx-1 px-1">
      {pills.map((p) => {
        const isActive = active === p.id;
        const disabled = p.count === 0 && p.id !== "all";
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? "text-white"
                : "bg-cream-deep text-ink-muted hover:text-ink"
            }`}
            style={isActive ? { backgroundColor: "#0B3D7A" } : undefined}
          >
            {p.label}
            <span className={`tabular-nums text-[11px] ${isActive ? "text-white/85" : "text-ink-faint"}`}>
              {p.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Reddit-style post: vote arrow + count on left rail, post body on right.
// Hover lifts the title color toward Reddit-blue and underlines, like a real
// reddit feed item.
function RedditPostTile({
  post,
  insight,
  tag,
}: {
  post: RedditPostSummary;
  insight: string;
  tag: "request" | "complaint" | "discussion";
}) {
  const meta = TAG_META[tag];
  const Icon = meta.icon;
  // Color the vote count by magnitude — Reddit-ish orange for highly upvoted.
  const voteColor =
    post.score >= 1000 ? "#FF4500" : post.score >= 100 ? "#0B3D7A" : "#6B7280";

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-line bg-white hover:border-ink-faint hover:shadow-sm transition-all"
    >
      <div className="flex gap-0">
        {/* Left vote rail */}
        <div className="flex flex-col items-center justify-start gap-0.5 py-4 pl-3 pr-2 sm:pl-4 sm:pr-3 rounded-l-xl bg-cream/40 min-w-[58px] sm:min-w-[68px]">
          <ArrowBigUp
            size={20}
            strokeWidth={1.85}
            style={{ color: voteColor }}
            className="shrink-0"
          />
          <span
            className="text-[13px] font-bold tabular-nums leading-none"
            style={{ color: voteColor }}
          >
            {formatCompact(post.score)}
          </span>
        </div>

        {/* Post body */}
        <div className="flex-1 min-w-0 p-4 sm:p-5">
          {/* Meta row — like reddit's "r/sub · Posted by u/author · 2d ago" */}
          <div className="flex items-center gap-1.5 flex-wrap text-[12px] mb-2">
            <span className="font-semibold text-ink">r/{post.subreddit}</span>
            <span className="text-ink-faint">·</span>
            <span className="text-ink-muted">u/{post.author}</span>
            <span className="text-ink-faint">·</span>
            <span className="text-ink-faint">{relativeTime(post.createdAt)}</span>
            <span
              className={`ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded-full ${meta.tile}`}
              title={meta.blurb}
            >
              <Icon size={10} strokeWidth={2} />
              {meta.label}
            </span>
          </div>

          {/* Title — the reddit link feel */}
          <h3
            className="text-[16px] sm:text-[17px] font-semibold text-ink leading-snug group-hover:text-accent-deep transition-colors"
            style={{ color: undefined }}
          >
            {post.title}
          </h3>

          {/* Body excerpt */}
          {post.body && (
            <p className="text-[13px] text-ink-muted leading-relaxed mt-2 line-clamp-3">
              {post.body.replace(/\s+/g, " ").slice(0, 320)}
              {post.body.length > 320 && "…"}
            </p>
          )}

          {/* Quiet inline insight — italic, prefixed with a small spark icon.
              Not a separate panel — feels like a margin note next to the post. */}
          <p className="text-[12px] text-ink-muted italic leading-relaxed mt-3 pl-3 border-l-2 border-line">
            <Lightbulb size={11} className="inline-block mr-1 -mt-0.5 not-italic" />
            {insight}
          </p>

          {/* Footer — reddit-style action row */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-line-soft text-[12px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={13} strokeWidth={2} />
              <span className="font-medium">{formatCompact(post.numComments)}</span>
              <span>comments</span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-ink-muted group-hover:text-ink transition-colors">
              Open on Reddit
              <ExternalLink size={11} />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

// A single quiet line at the bottom of the feed — not a "How we searched"
// section. Just enough so the user can see which subreddits we hit.
function SearchedFootnote({ result }: { result: RedditAnalysisPayload }) {
  return (
    <p className="text-[12px] text-ink-faint pt-6 border-t border-line-soft mt-8">
      Searched{" "}
      {result.plan.subreddits.slice(0, 6).map((s, i) => (
        <span key={s}>
          {i > 0 && ", "}
          <span className="text-ink-muted">r/{s}</span>
        </span>
      ))}
      {result.plan.subreddits.length > 6 && (
        <span className="text-ink-muted"> +{result.plan.subreddits.length - 6} more</span>
      )}
      {" "}using {result.plan.demandQueries.length} demand queries.
    </p>
  );
}

// --- recent --------------------------------------------------------------

function RecentAnalyses({
  records,
  onDelete,
}: {
  records: RedditAnalysisRecord[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center">
          <MessageSquare size={16} strokeWidth={1.85} />
        </div>
        <div>
          <p className="eyebrow">History</p>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
            Your recent demand checks
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.slice(0, 9).map((r) => {
          const tone = scoreTone(r.demandScore);
          return (
            <div key={r.id} className="card-soft p-5 group relative">
              <Link href={`/reddit?id=${r.id}`} className="block">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tone.bg, color: tone.ink }}
                  >
                    {r.demandLabel}
                  </span>
                  <span
                    className="text-[18px] font-bold tabular-nums"
                    style={{ color: tone.ink }}
                  >
                    {r.demandScore}
                  </span>
                </div>
                <p className="text-[14px] font-medium text-ink leading-snug line-clamp-3">
                  {r.ideaPreview}
                </p>
                <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                  <span>{r.postCount} relevant posts</span>
                  <span className="tabular-nums">{relativeTime(r.createdAt)}</span>
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

// --- helpers -------------------------------------------------------------

function countDistinctSubs(result: RedditAnalysisPayload): number {
  const set = new Set<string>();
  for (const s of result.rank.selectedPosts) {
    const p = result.posts.find((x) => x.id === s.id);
    if (p) set.add(p.subreddit);
  }
  return set.size;
}

function scoreTone(score: number): { bg: string; ring: string; ink: string } {
  if (score >= 81) return { bg: "#DCFCE7", ring: "#16A34A", ink: "#15803D" };
  if (score >= 61) return { bg: "#DBEAFE", ring: "#2563EB", ink: "#1D4ED8" };
  if (score >= 41) return { bg: "#FEF3C7", ring: "#D97706", ink: "#B45309" };
  if (score >= 21) return { bg: "#FFE4E6", ring: "#E11D48", ink: "#BE123C" };
  return { bg: "#F1F5F9", ring: "#94A3B8", ink: "#475569" };
}

function formatCompact(n: number): string {
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
