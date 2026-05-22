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
  Activity,
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

const TILE_COLORS = [
  "tile-blue",
  "tile-lilac",
  "tile-mint",
  "tile-cream",
  "tile-rose",
  "tile-peach",
] as const;

function tileForIndex(i: number) {
  return TILE_COLORS[i % TILE_COLORS.length];
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
            : "Tracker created. No mentions found yet — we'll check every 2 hours.",
          result.newMentionCount > 0 ? "success" : "default",
        );
      }
    } catch {
      addToast("Tracker created but initial check failed. We'll retry in 2 hours.", "default");
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl tile-blue">
            <Bell className="h-7 w-7" />
          </div>
          <h1 className="text-[22px] font-semibold text-ink">Buzz Tracker</h1>
          <p className="mt-2 text-[15px] text-ink-muted leading-relaxed">
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
              className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40"
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
        <div>
          <button
            onClick={() => router.push("/buzz")}
            className="mb-6 text-[13px] font-medium text-accent-ink hover:text-accent transition-colors"
          >
            &larr; All trackers
          </button>

          {/* Stats strip */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-line bg-paper px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-0.5">Keywords</p>
              <p className="text-[20px] font-semibold text-ink">{selectedTracker.keywords.length}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-0.5">Mentions</p>
              <p className="text-[20px] font-semibold text-ink">{trackerMentions.length}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-0.5">Subreddits</p>
              <p className="text-[20px] font-semibold text-ink">
                {selectedTracker.subreddits?.length ?? "All"}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-paper px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-0.5">Last checked</p>
              <p className="text-[14px] font-medium text-ink mt-0.5">
                {selectedTracker.lastCheckedAt ? timeAgo(selectedTracker.lastCheckedAt) : "Never"}
              </p>
            </div>
          </div>

          {/* Keyword chips */}
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
          </div>

          {/* Sort pills */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint mr-1">Sort</span>
            {(["newest", "score", "comments"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  sort === key
                    ? "bg-accent-ink text-white shadow-sm"
                    : "bg-cream-deep text-ink-muted hover:text-ink hover:bg-cream"
                }`}
              >
                {key === "newest" ? "Newest" : key === "score" ? "Top score" : "Most discussed"}
              </button>
            ))}
          </div>

          {/* Mentions list */}
          {trackerMentions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl tile-cream">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-[15px] font-semibold text-ink">No mentions found yet</p>
              <p className="mt-1.5 text-[13px] text-ink-muted max-w-sm mx-auto leading-relaxed">
                Click &ldquo;Scan now&rdquo; to check Reddit, or wait for the next automatic check (every 2 hours).
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
      <div>
        {/* Create form */}
        {showCreate && (
          <div className="mb-8 rounded-2xl border border-line bg-paper overflow-hidden animate-fade-up">
            {/* Form header */}
            <div className="px-6 pt-6 pb-4 border-b border-line-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl tile-blue">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold text-ink">Create a new tracker</h2>
                    <p className="text-[12px] text-ink-faint">Add keywords to monitor across Reddit</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setKeywords([]);
                    setSubreddits([]);
                    setSuggestions([]);
                  }}
                  className="rounded-full p-2 text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Keywords section */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <Tag className="h-3.5 w-3.5 text-accent-ink" />
                  Keywords
                  <span className="font-normal text-ink-faint">({keywords.length}/5)</span>
                </label>
                {keywords.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="group/chip inline-flex items-center gap-1.5 rounded-full tile-blue px-3 py-1.5 text-[13px] font-medium transition-all"
                      >
                        {kw}
                        <button
                          onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
                          className="rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
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
                    className="flex-1 rounded-xl bg-cream-deep px-4 py-3 text-[14px] text-ink outline-none border border-transparent transition-all focus:border-accent/30 focus:bg-white focus:shadow-sm placeholder:text-ink-faint"
                    disabled={keywords.length >= 5}
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!kwInput.trim() || keywords.length >= 5}
                    className="rounded-xl border border-line px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-all hover:border-ink-faint hover:text-ink hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* AI suggestions */}
              {(keywords.length > 0 || kwInput.trim()) && keywords.length < 5 && (
                <div className="rounded-xl bg-accent-band-soft/50 border border-accent-band p-4">
                  <button
                    onClick={fetchSuggestions}
                    disabled={loadingSuggestions}
                    className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-accent-ink transition-colors hover:text-accent"
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
                          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-accent-band px-3 py-1.5 text-[12px] font-medium text-accent-ink shadow-sm transition-all hover:border-accent hover:shadow-md hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subreddits section */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <MessageCircle className="h-3.5 w-3.5 text-accent-ink" />
                  Subreddits
                  <span className="font-normal text-ink-faint">(optional)</span>
                </label>
                {subreddits.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {subreddits.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1.5 text-[13px] font-medium text-ink-muted"
                      >
                        r/{sub}
                        <button
                          onClick={() => setSubreddits((prev) => prev.filter((s) => s !== sub))}
                          className="rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
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
                    placeholder="e.g. android, androidapps, startups"
                    className="flex-1 rounded-xl bg-cream-deep px-4 py-3 text-[14px] text-ink outline-none border border-transparent transition-all focus:border-accent/30 focus:bg-white focus:shadow-sm placeholder:text-ink-faint"
                  />
                  <button
                    onClick={addSubreddit}
                    disabled={!subInput.trim()}
                    className="rounded-xl border border-line px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-all hover:border-ink-faint hover:text-ink hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Form footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-line-soft bg-cream/30">
              <button
                onClick={handleCreate}
                disabled={keywords.length === 0 || creating}
                className="flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-night-soft hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Create &amp; scan now
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setKeywords([]);
                  setSubreddits([]);
                  setSuggestions([]);
                }}
                className="rounded-full px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tracker list */}
        {buzzTrackers.length === 0 && !showCreate ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper py-20 text-center">
            {/* Decorative icon cluster */}
            <div className="relative mx-auto mb-6 h-20 w-28">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl tile-blue shadow-sm">
                <Bell className="h-7 w-7" />
              </div>
              <div className="absolute -left-1 top-0 flex h-9 w-9 items-center justify-center rounded-xl tile-lilac shadow-sm rotate-[-8deg]">
                <Tag className="h-4 w-4" />
              </div>
              <div className="absolute -right-1 bottom-0 flex h-9 w-9 items-center justify-center rounded-xl tile-mint shadow-sm rotate-[8deg]">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <h2 className="text-[18px] font-semibold text-ink">No trackers yet</h2>
            <p className="mt-2 text-[14px] text-ink-muted max-w-sm mx-auto leading-relaxed">
              Create a tracker to start monitoring Reddit for your brand, product, or any keyword that matters.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-night-soft"
            >
              <Plus className="h-4 w-4" />
              Create your first tracker
            </button>
          </div>
        ) : buzzTrackers.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="mb-6 flex items-center gap-4 rounded-xl bg-paper border border-line px-5 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg tile-blue">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  {buzzTrackers.length} tracker{buzzTrackers.length !== 1 ? "s" : ""} active
                </p>
                <p className="text-[12px] text-ink-faint">
                  {buzzMentions.length} total mention{buzzMentions.length !== 1 ? "s" : ""}
                  {totalUnseen > 0 && (
                    <span className="text-accent font-semibold"> · {totalUnseen} new</span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buzzTrackers.map((tracker, i) => (
                <TrackerCard
                  key={tracker.id}
                  tracker={tracker}
                  mentionCount={buzzMentions.filter((m) => m.trackerId === tracker.id).length}
                  onOpen={() => router.push(`/buzz?id=${tracker.id}`)}
                  onRunNow={() => handleRunNow(tracker.id)}
                  onDelete={() => handleDelete(tracker.id)}
                  checking={checking === tracker.id}
                  tileColor={tileForIndex(i)}
                />
              ))}
            </div>
          </>
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
  tileColor,
}: {
  tracker: BuzzTracker;
  mentionCount: number;
  onOpen: () => void;
  onRunNow: () => void;
  onDelete: () => void;
  checking: boolean;
  tileColor: string;
}) {
  return (
    <div className="card-soft group relative rounded-2xl border border-line bg-paper transition-all overflow-hidden">
      <button onClick={onOpen} className="block w-full text-left p-5 pb-0">
        {/* Icon + keyword header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tileColor} shrink-0`}>
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5">
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
              <p className="mt-1.5 text-[12px] text-ink-faint truncate">
                {tracker.subreddits.map((s) => `r/${s}`).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 py-3 border-t border-line-soft">
          <div>
            <p className="text-[18px] font-semibold text-ink leading-none">{mentionCount}</p>
            <p className="text-[11px] text-ink-faint mt-0.5">mention{mentionCount !== 1 ? "s" : ""}</p>
          </div>
          {tracker.unseenCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white animate-fade-in">
              +{tracker.unseenCount} new
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {tracker.enabled && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto · 2h
              </span>
            )}
            {tracker.lastCheckedAt && (
              <span className="flex items-center gap-1 text-[11px] text-ink-faint">
                <Clock className="h-3 w-3" />
                {timeAgo(tracker.lastCheckedAt)}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-line-soft bg-cream/20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRunNow();
          }}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-all hover:bg-cream-deep hover:text-ink disabled:opacity-40"
        >
          {checking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Scan now
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-auto flex items-center gap-1 rounded-lg p-1.5 text-ink-faint transition-all hover:bg-red-50 hover:text-red-500"
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
      <mark key={i} className="rounded bg-gold/30 px-0.5 text-ink font-semibold">
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
    <div className="card-soft rounded-2xl border border-line bg-paper overflow-hidden transition-all">
      <div className="p-5">
        {/* Top meta row */}
        <div className="mb-2.5 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-cream-deep px-2.5 py-0.5 text-[12px] font-semibold text-ink">
            r/{mention.subreddit}
          </span>
          <span className="text-[12px] text-ink-faint">
            u/{mention.author}
          </span>
          <span className="text-[12px] text-ink-faint flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(mention.postCreatedAt)}
          </span>
          {!mention.seen && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
              New
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-1.5 text-[15px] font-semibold leading-snug text-ink">
          {highlightKeyword(mention.title, trackerKeywords)}
        </h3>

        {/* Body preview */}
        {bodyPreview && (
          <p className="mb-4 text-[13px] leading-relaxed text-ink-muted line-clamp-3">
            {highlightKeyword(bodyPreview, trackerKeywords)}
          </p>
        )}

        {/* Bottom stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-deep px-2.5 py-1 text-[12px] font-medium text-ink-muted">
            <ArrowBigUp className="h-3.5 w-3.5" />
            {mention.score}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream-deep px-2.5 py-1 text-[12px] font-medium text-ink-muted">
            <MessageCircle className="h-3.5 w-3.5" />
            {mention.numComments}
          </span>
          <span className="rounded-full tile-blue px-2.5 py-0.5 text-[11px] font-semibold">
            {mention.matchedKeyword}
          </span>
          <a
            href={mention.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] font-medium text-accent-ink transition-all hover:border-accent hover:bg-accent-band-soft"
          >
            <ExternalLink className="h-3 w-3" />
            Open on Reddit
          </a>
        </div>
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
