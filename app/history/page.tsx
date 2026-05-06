"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/shared/AppNav";
import { useAuth } from "@/lib/auth";
import { History as HistoryIcon, Trash2, ArrowRight } from "lucide-react";

export default function HistoryPage() {
  const { user, loading, history, removeHistory } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <>
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2 animate-fade-up">
          <HistoryIcon size={24} className="text-ink-faint" />
          <h1 className="text-3xl font-semibold text-ink">History</h1>
        </div>
        <p className="text-sm text-ink-muted mb-8 animate-fade-up">
          Every generation is auto-saved here. Open one to view, edit, or save it to your library.
        </p>

        {history.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-line text-center animate-fade-up">
            <HistoryIcon size={28} className="text-ink-faint mx-auto mb-3" />
            <p className="text-sm text-ink-muted mb-4">No generations yet.</p>
            <Link
              href="/generator"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors text-sm"
            >
              Start a generation
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((gen, i) => {
              const variants = gen.android || gen.ios || [];
              const platforms: string[] = [];
              if (gen.android) platforms.push("Play Store");
              if (gen.ios) platforms.push("App Store");
              return (
                <div
                  key={gen.id}
                  className="group p-5 rounded-2xl bg-surface border border-line hover:border-ink-faint transition-colors animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <Link
                        href={`/history/${gen.id}`}
                        className="text-base font-semibold text-ink hover:text-accent transition-colors"
                      >
                        {gen.input.appName}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-xs text-ink-faint">
                        <span>{new Date(gen.createdAt).toLocaleString()}</span>
                        <span>·</span>
                        <span>{platforms.join(" + ")}</span>
                        <span>·</span>
                        <span className="capitalize">{gen.input.tone}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeHistory(gen.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-ink-faint hover:text-warn hover:bg-warn/5"
                      aria-label="Delete history entry"
                      title="Delete from history"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Link href={`/history/${gen.id}`} className="block">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {variants.slice(0, 3).map((v) => (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl bg-paper border border-line-soft"
                        >
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
                          <p className="text-sm font-semibold text-ink mt-2 truncate">
                            {v.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
