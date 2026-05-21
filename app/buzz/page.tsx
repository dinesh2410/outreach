"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import type { BuzzTracker, BuzzMention } from "@/lib/types";
import {
  ArrowBigUp,
  Bell,
  Clock,
  ExternalLink,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
  Sparkles,
} from "@/components/shared/Icon";

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function buzzTrackerId(keywords: string[]): string {
  const key = keywords
    .map((k) => k.trim().toLowerCase())
    .sort()
    .join("|");
  return `bt_${djb2(key)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SortKey = "newest" | "score" | "comments";

function BuzzContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");
  const {
    user,
    loading,
    buzzTrackers,
    buzzMentions,
    saveBuzzTracker,
    removeBuzzTracker,
    addBuzzMentions,
    markMentionsSeen,
    checkQuota,
    useQuota,
  } = useAuth();
  const { push: addToast } = useToast();

  const [kwInput, setKwInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [subInput, setSubInput] = useState("");
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [showCreate, setShowCreate] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!selectedId || !user) return;
    const unseen = buzzMentions.filter(
      (m) => m.trackerId === selectedId && !m.seen,
    );
    if (unseen.length > 0) {
      markMentionsSeen(
        selectedId,
        unseen.map((m) => m.id),
      );
    }
  }, [selectedId, user, buzzMentions, markMentionsSeen]);

  const addKeyword = useCallback(() => {
    const kw = kwInput.trim();
    if (!kw || keywords.length >= 5 || keywords.includes(kw)) return;
    setKeywords((prev) => [...prev, kw]);
    setKwInput("");
  }, [kwInput, keywords]);

  const fetchSuggestions = useCallback(async () => {
    const seed = keywords[0] || kwInput.trim();
    if (!seed) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/buzz/suggest-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: seed }),
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.suggestions as string[]).filter(
          (s) => !keywords.includes(s),
        );
        setSuggestions(filtered);
      } else {
        addToast("Could not fetch suggestions. Try again.", "default");
      }
    } catch {
      addToast("Could not fetch suggestions. Try again.", "default");
    }
    setLoadingSuggestions(false);
  }, [keywords, kwInput, addToast]);

  const addSubreddit = useCallback(() => {
    const sub = subInput.trim().replace(/^r\//, "");
    if (!sub || subreddits.length >= 10 || subreddits.includes(sub)) return;
    setSubreddits((prev) => [...prev, sub]);
    setSubInput("");
  }, [subInput, subreddits]);

  const handleCreate = useCallback(async () => {
    if (!user || keywords.length === 0) return;
    const quota = checkQuota("buzzTracker");
    if (!quota.allowed) {
      addToast(`Buzz Tracker limit reached (${quota.used}/${quota.limit}). Upgrade your plan.`, "default");
      return;
    }

    setCreating(true);
    const id = buzzTrackerId(keywords);
    const tracker: BuzzTracker = {
      id,
      keywords: [...keywords],
      subreddits: subreddits.length > 0 ? [...subreddits] : undefined,
      enabled: true,
      totalMentions: 0,
      unseenCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveBuzzTracker(tracker);
    await useQuota("buzzTracker");

    try {
      const res = await fetch("/api/buzz/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackerId: id, keywords, subreddits: subreddits.length > 0 ? subreddits : undefined }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.mentions?.length > 0) {
          addBuzzMentions(result.mentions, id, result.mentions.length);
        }
        addToast(
          result.newMentionCount > 0
            ? `Found ${result.newMentionCount} mention${result.newMentionCount === 1 ? "" : "s"}!`
            : "Tracker created. No mentions found yet — we'll check hourly.",
          result.newMentionCount > 0 ? "success" : "default",
        );
      }
    } catch {
      addToast("Tracker created but initial check failed. We'll retry hourly.", "default");
    }

    setKeywords([]);
    setSubreddits([]);
    setSuggestions([]);
    setShowCreate(false);
    setCreating(false);
    router.push(`/buzz?id=${id}`);
  }, [user, keywords, subreddits, checkQuota, saveBuzzTracker, useQuota, addBuzzMentions, addToast, router]);

  const handleRunNow = useCallback(
    async (trackerId: string) => {
      if (!user || checking) return;
      const tracker = buzzTrackers.find((t) => t.id === trackerId);
      if (!tracker) return;
      setChecking(trackerId);
      try {
        const res = await fetch("/api/buzz/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackerId,
            keywords: tracker.keywords,
            subreddits: tracker.subreddits,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.mentions?.length > 0) {
            const newMentions = result.mentions.filter(
              (m: BuzzMention) => !buzzMentions.some((existing) => existing.id === m.id),
            );
            if (newMentions.length > 0) {
              addBuzzMentions(newMentions, trackerId, newMentions.length);
            }
          }
          addToast(
            result.newMentionCount > 0
              ? `Found ${result.newMentionCount} new mention${result.newMentionCount === 1 ? "" : "s"}!`
              : "No new mentions found.",
            result.newMentionCount > 0 ? "success" : "default",
          );
        } else {
          addToast("Check failed. Try again in a moment.", "default");
        }
      } catch {
        addToast("Check failed. Try again in a moment.", "default");
      }
      setChecking(null);
    },
    [user, checking, buzzTrackers, buzzMentions, addBuzzMentions, addToast],
  );

  const handleDelete = useCallback(
    (trackerId: string) => {
      removeBuzzTracker(trackerId);
      if (selectedId === trackerId) router.push("/buzz");
      addToast("Tracker deleted.", "default");
    },
    [removeBuzzTracker, selectedId, router, addToast],
  );

  const selectedTracker = useMemo(
    () => buzzTrackers.find((t) => t.id === selectedId),
    [buzzTrackers, selectedId],
  );

  const trackerMentions = useMemo(() => {
    if (!selectedId) return [];
    const mentions = buzzMentions.filter((m) => m.trackerId === selectedId);
    switch (sort) {
      case "score":
        return [...mentions].sort((a, b) => b.score - a.score);
      case "comments":
        return [...mentions].sort((a, b) => b.numComments - a.numComments);
      default:
        return [...mentions].sort(
          (a, b) => new Date(b.foundAt).getTime() - new Date(a.foundAt).getTime(),
        );
    }
  }, [selectedId, buzzMentions, sort]);

  const totalUnseen = useMemo(
    () => buzzTrackers.reduce((sum, t) => sum + t.unseenCount, 0),
    [buzzTrackers],
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl tile-blue">
            <Bell className="h-6 w-6" />
          </div>
          <h1 className="text-[22px] font-semibold text-ink">Buzz Tracker</h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Sign in to monitor brand mentions on Reddit.
          </p>
        </div>
      </AppShell>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selectedId && selectedTracker) {
    return (
      <AppShell
        eyebrow="Tools · Buzz Tracker"
        title={selectedTracker.keywords.join(", ")}
        description={
          selectedTracker.subreddits?.length
            ? `Monitoring ${selectedTracker.subreddits.map((s) => `r/${s}`).join(", ")}`
            : "Monitoring all of Reddit"
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunNow(selectedId)}
              disabled={!!checking}
              className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
            >
              {checking === selectedId ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Run now
            </button>
            <button
              onClick={() => handleDelete(selectedId)}
              className="flex items-center justify-center rounded-full border border-line p-2 text-ink-faint transition-colors hover:border-red-300 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Back link */}
          <button
            onClick={() => router.push("/buzz")}
            className="mb-6 text-[13px] font-medium text-accent-ink hover:text-accent transition-colors"
          >
            &larr; All trackers
          </button>

          {/* Keywords + stats */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {selectedTracker.keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 rounded-full tile-blue px-3 py-1 text-[13px] font-medium"
              >
                <Tag className="h-3 w-3" />
                {kw}
              </span>
            ))}
            <span className="text-[13px] text-ink-muted">
              · {trackerMentions.length} mention{trackerMentions.length !== 1 ? "s" : ""}
            </span>
            {selectedTracker.lastCheckedAt && (
              <span className="flex items-center gap-1 text-[13px] text-ink-faint">
                <Clock className="h-3 w-3" />
                {timeAgo(selectedTracker.lastCheckedAt)}
              </span>
            )}
          </div>

          {/* Sort pills */}
          <div className="mb-6 flex gap-2">
            {(["newest", "score", "comments"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  sort === key
                    ? "bg-accent-ink text-white"
                    : "bg-cream-deep text-ink-muted hover:text-ink"
                }`}
              >
                {key === "newest" ? "Newest" : key === "score" ? "Most upvoted" : "Most comments"}
              </button>
            ))}
          </div>

          {/* Mentions list */}
          {trackerMentions.length === 0 ? (
            <div className="rounded-2xl border border-line bg-paper py-16 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
              <p className="text-[15px] font-medium text-ink">No mentions found yet.</p>
              <p className="mt-1 text-[13px] text-ink-muted">
                Click &quot;Run now&quot; or wait for the next hourly check.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trackerMentions.map((mention) => (
                <MentionCard
                  key={mention.id}
                  mention={mention}
                  trackerKeywords={selectedTracker.keywords}
                />
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <AppShell
      eyebrow="Tools"
      title="Buzz Tracker"
      description={
        totalUnseen > 0
          ? `Monitor when your brand or keywords get mentioned on Reddit. ${totalUnseen} new mention${totalUnseen !== 1 ? "s" : ""}.`
          : "Monitor when your brand or keywords get mentioned on Reddit."
      }
      actions={
        <button
          onClick={() => setShowCreate((prev) => !prev)}
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-night-soft"
        >
          <Plus className="h-4 w-4" />
          New tracker
        </button>
      }
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Create form */}
        {showCreate && (
          <div className="mb-8 rounded-2xl border border-line bg-paper p-6">
            <h2 className="mb-5 text-[17px] font-semibold text-ink">Create a new tracker</h2>

            {/* Keywords input */}
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">
              Keywords <span className="font-normal text-ink-faint">(max 5)</span>
            </label>
            {keywords.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 rounded-full tile-blue px-3 py-1 text-[13px] font-medium"
                  >
                    {kw}
                    <button
                      onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-accent/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="Type a keyword and press Enter"
                className="flex-1 rounded-full bg-cream-deep px-5 py-3 text-[14px] text-ink outline-none border border-transparent transition-colors focus:border-ink-faint placeholder:text-ink-faint"
                disabled={keywords.length >= 5}
              />
              <button
                onClick={addKeyword}
                disabled={!kwInput.trim() || keywords.length >= 5}
                className="rounded-full border border-line px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {/* AI suggestions */}
            {(keywords.length > 0 || kwInput.trim()) && keywords.length < 5 && (
              <div className="mb-5">
                <button
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="mb-2.5 flex items-center gap-1.5 text-[13px] font-medium text-accent-ink transition-colors hover:text-accent"
                >
                  {loadingSuggestions ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {loadingSuggestions ? "Finding related keywords..." : "Suggest related keywords with AI"}
                </button>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          if (keywords.length >= 5 || keywords.includes(s)) return;
                          setKeywords((prev) => [...prev, s]);
                          setSuggestions((prev) => prev.filter((x) => x !== s));
                        }}
                        disabled={keywords.length >= 5 || keywords.includes(s)}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-all hover:border-accent hover:bg-accent-band-soft hover:text-accent-ink disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3" />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subreddits input */}
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">
              Subreddits <span className="font-normal text-ink-faint">(optional, for focused monitoring)</span>
            </label>
            {subreddits.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {subreddits.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1 text-[13px] font-medium text-ink-muted"
                  >
                    r/{sub}
                    <button
                      onClick={() => setSubreddits((prev) => prev.filter((s) => s !== sub))}
                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-ink/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mb-6 flex gap-2">
              <input
                type="text"
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubreddit();
                  }
                }}
                placeholder="e.g. android, androidapps"
                className="flex-1 rounded-full bg-cream-deep px-5 py-3 text-[14px] text-ink outline-none border border-transparent transition-colors focus:border-ink-faint placeholder:text-ink-faint"
              />
              <button
                onClick={addSubreddit}
                disabled={!subInput.trim()}
                className="rounded-full border border-line px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={keywords.length === 0 || creating}
                className="flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-night-soft disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Create &amp; check now
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setKeywords([]);
                  setSubreddits([]);
                  setSuggestions([]);
                }}
                className="rounded-full border border-line px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tracker list */}
        {buzzTrackers.length === 0 && !showCreate ? (
          <div className="rounded-2xl border border-line bg-paper py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl tile-blue">
              <Bell className="h-6 w-6" />
            </div>
            <h2 className="text-[17px] font-semibold text-ink">No trackers yet</h2>
            <p className="mt-1 text-[14px] text-ink-muted">
              Create one to start monitoring Reddit for your keywords.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buzzTrackers.map((tracker) => (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                mentionCount={buzzMentions.filter((m) => m.trackerId === tracker.id).length}
                onOpen={() => router.push(`/buzz?id=${tracker.id}`)}
                onRunNow={() => handleRunNow(tracker.id)}
                onDelete={() => handleDelete(tracker.id)}
                checking={checking === tracker.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TrackerCard({
  tracker,
  mentionCount,
  onOpen,
  onRunNow,
  onDelete,
  checking,
}: {
  tracker: BuzzTracker;
  mentionCount: number;
  onOpen: () => void;
  onRunNow: () => void;
  onDelete: () => void;
  checking: boolean;
}) {
  return (
    <div className="card-soft group relative rounded-2xl border border-line bg-paper p-5 transition-all">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tracker.keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 rounded-full tile-blue px-2.5 py-0.5 text-[12px] font-semibold"
            >
              <Tag className="h-2.5 w-2.5" />
              {kw}
            </span>
          ))}
        </div>

        {tracker.subreddits && tracker.subreddits.length > 0 && (
          <p className="mb-2 text-[12px] text-ink-faint">
            {tracker.subreddits.map((s) => `r/${s}`).join(", ")}
          </p>
        )}

        <div className="flex items-center gap-3 text-[13px] text-ink-muted">
          <span className="font-medium">{mentionCount} mention{mentionCount !== 1 ? "s" : ""}</span>
          {tracker.unseenCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              {tracker.unseenCount} new
            </span>
          )}
        </div>

        {tracker.lastCheckedAt && (
          <p className="mt-1.5 flex items-center gap-1 text-[12px] text-ink-faint">
            <Clock className="h-3 w-3" />
            {timeAgo(tracker.lastCheckedAt)}
          </p>
        )}
      </button>

      <div className="mt-4 flex items-center gap-2 border-t border-line-soft pt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRunNow();
          }}
          disabled={checking}
          className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {checking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Run now
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-auto flex items-center gap-1 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-cream-deep hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function highlightKeyword(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text;
  const pattern = keywords
    .map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-yellow-200/70 px-0.5 text-yellow-900 font-medium">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function MentionCard({
  mention,
  trackerKeywords,
}: {
  mention: BuzzMention;
  trackerKeywords: string[];
}) {
  const bodyPreview = mention.body.length > 300
    ? mention.body.slice(0, 300) + "..."
    : mention.body;

  return (
    <div className="card-soft rounded-2xl border border-line bg-paper p-5 transition-all">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-ink-faint">
        <span className="font-semibold text-ink-muted">r/{mention.subreddit}</span>
        <span>&middot;</span>
        <span>u/{mention.author}</span>
        <span>&middot;</span>
        <span>{timeAgo(mention.postCreatedAt)}</span>
        {!mention.seen && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
            NEW
          </span>
        )}
      </div>

      <h3 className="mb-1 text-[14px] font-semibold leading-snug text-ink">
        {highlightKeyword(mention.title, trackerKeywords)}
      </h3>

      {bodyPreview && (
        <p className="mb-3 text-[13px] leading-relaxed text-ink-muted">
          {highlightKeyword(bodyPreview, trackerKeywords)}
        </p>
      )}

      <div className="flex items-center gap-4 text-[12px] text-ink-faint">
        <span className="flex items-center gap-1">
          <ArrowBigUp className="h-3.5 w-3.5" />
          {mention.score}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {mention.numComments}
        </span>
        <span className="rounded-full tile-blue px-2 py-0.5 text-[11px] font-semibold">
          {mention.matchedKeyword}
        </span>
        <a
          href={mention.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 font-medium text-accent-ink transition-colors hover:text-accent"
        >
          <ExternalLink className="h-3 w-3" />
          Reddit
        </a>
      </div>
    </div>
  );
}

// ── Page wrapper with Suspense ─────────────────────────────────────────────

export default function BuzzPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
          </div>
        </AppShell>
      }
    >
      <BuzzContent />
    </Suspense>
  );
}
