"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import { Copy, Search, BookOpen } from "lucide-react";
import Link from "next/link";

export default function LibraryPage() {
  const { user, savedGenerations } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "android" | "ios">("all");

  useEffect(() => {
    if (!user) router.push("/auth");
  }, [user, router]);

  if (!user) return null;

  const filtered = savedGenerations.filter((gen) => {
    const matchesSearch = gen.input.appName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "android" && gen.android) ||
      (filter === "ios" && gen.ios);
    return matchesSearch && matchesFilter;
  });

  return (
    <AppShell
      eyebrow="Workspace · Library"
      title="What you saved for later"
      description="The variants you marked to reuse. Search, filter, or copy any of them into your clipboard."
    >
      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by app name"
            className="w-full pl-12 pr-5 h-12 rounded-full bg-cream-deep border border-transparent text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink-faint text-[14px] transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-cream-deep rounded-full p-1">
          {(["all", "android", "ios"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                filter === f ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {f === "all" ? "All" : f === "android" ? "Play" : "iOS"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-soft p-14 text-center">
          <div className="w-14 h-14 rounded-2xl tile-lilac inline-flex items-center justify-center mb-4">
            <BookOpen size={22} strokeWidth={1.85} />
          </div>
          <h2 className="text-[18px] font-semibold text-ink mb-2">
            {savedGenerations.length === 0
              ? "Nothing saved yet"
              : "No results match"}
          </h2>
          <p className="text-[14px] text-ink-muted mb-6 max-w-sm mx-auto">
            {savedGenerations.length === 0
              ? "Generate a few variants and save the keepers — they'll show up here for easy reuse."
              : "Try a different search or clear the filters."}
          </p>
          {savedGenerations.length === 0 && (
            <Link
              href="/generator"
              className="inline-flex items-center px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
            >
              Generate descriptions
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((gen) => {
            const variants = gen.android || gen.ios || [];
            return variants.map((v) => {
              const tile =
                v.approach === "keyword"
                  ? "tile-blue"
                  : v.approach === "conversion"
                    ? "tile-cream"
                    : "tile-mint";
              return (
                <div
                  key={`${gen.id}-${v.id}`}
                  className="flex items-center gap-5 card-soft p-5"
                >
                  <div className={`w-12 h-12 rounded-xl ${tile} shrink-0 flex items-center justify-center font-semibold text-[15px]`}>
                    {gen.input.appName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink truncate text-[15px]">
                        {gen.input.appName}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${tile}`}>
                        {v.label}
                      </span>
                      <span className="text-[10px] font-medium text-ink-faint px-2 py-0.5 rounded-full bg-cream-deep">
                        {gen.android ? "Play" : "iOS"}
                      </span>
                    </div>
                    <p className="text-[13px] text-ink-muted truncate mt-1.5">
                      {v.title}
                      {v.shortDesc ? ` — ${v.shortDesc}` : v.subtitle ? ` — ${v.subtitle}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Title: ${v.title}\n${v.shortDesc ? `Short: ${v.shortDesc}` : `Subtitle: ${v.subtitle}`}\n\n${v.fullDesc}`
                      );
                      push("Copied to clipboard", "success");
                    }}
                    className="shrink-0 p-2.5 rounded-lg text-ink-faint hover:text-ink hover:bg-cream-deep transition-colors"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              );
            });
          })}
        </div>
      )}
    </AppShell>
  );
}
