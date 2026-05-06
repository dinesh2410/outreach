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
      title="Library"
      description="Generations you've explicitly saved for reuse."
    >
      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by app name"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
            />
          </div>
          <div className="flex gap-1 bg-surface rounded-xl border border-line p-1">
            {(["all", "android", "ios"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? "bg-accent text-white" : "text-ink-muted"
                }`}
              >
                {f === "all" ? "All" : f === "android" ? "Play" : "iOS"}
              </button>
            ))}
          </div>
        </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24">
            <BookOpen size={48} className="mx-auto text-ink-faint mb-4" />
            <h2 className="text-lg font-semibold text-ink mb-2">
              {savedGenerations.length === 0
                ? "No saved generations yet"
                : "No results match your filters"}
            </h2>
            <p className="text-sm text-ink-muted mb-6">
              {savedGenerations.length === 0
                ? "Generate some descriptions and save them here for easy access."
                : "Try adjusting your search or filters."}
            </p>
            {savedGenerations.length === 0 && (
              <Link
                href="/generator"
                className="inline-flex items-center px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors text-sm"
              >
                Generate descriptions
              </Link>
            )}
          </div>
      ) : (
        <div className="space-y-3">
            {filtered.map((gen) => {
              const variants = gen.android || gen.ios || [];
              return variants.map((v) => (
                <div
                  key={`${gen.id}-${v.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-line hover:border-ink-faint transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 bg-gradient-to-br from-accent to-gold"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink truncate">
                        {gen.input.appName}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          v.approach === "keyword"
                            ? "bg-accent/10 text-accent"
                            : v.approach === "conversion"
                              ? "bg-gold/10 text-gold"
                              : "bg-green/10 text-green"
                        }`}
                      >
                        {v.label}
                      </span>
                      <span className="text-[10px] font-mono text-ink-faint px-1.5 py-0.5 rounded bg-paper">
                        {gen.android ? "Play" : "iOS"}
                      </span>
                    </div>
                    <p className="text-sm text-ink-muted truncate mt-0.5">
                      {v.title}
                      {v.shortDesc ? ` \u2014 ${v.shortDesc}` : v.subtitle ? ` \u2014 ${v.subtitle}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Title: ${v.title}\n${v.shortDesc ? `Short: ${v.shortDesc}` : `Subtitle: ${v.subtitle}`}\n\n${v.fullDesc}`
                      );
                      push("Copied to clipboard", "success");
                    }}
                    className="shrink-0 p-2 text-ink-faint hover:text-ink transition-colors"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ));
            })}
        </div>
      )}
    </AppShell>
  );
}
