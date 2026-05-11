"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
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
    <AppShell
      eyebrow="Workspace · History"
      title="Every variant, auto-saved"
      description="Every generation lands here automatically. Open one to view, edit, or send it to your library."
    >
      {history.length === 0 ? (
        <div className="card-soft p-14 text-center animate-fade-up">
          <div className="w-14 h-14 rounded-2xl tile-blue inline-flex items-center justify-center mb-4">
            <HistoryIcon size={22} strokeWidth={1.85} />
          </div>
          <p className="text-[15px] text-ink-muted mb-6 max-w-sm mx-auto">
            No generations yet. Drop a brief into the generator and we&apos;ll save the variants here.
          </p>
          <Link
            href="/generator"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
          >
            Start a generation
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((gen, i) => {
            const variants = gen.android || gen.ios || [];
            const platforms: string[] = [];
            if (gen.android) platforms.push("Play Store");
            if (gen.ios) platforms.push("App Store");
            return (
              <div
                key={gen.id}
                className="group card-soft p-6 animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <Link
                      href={`/history/${gen.id}`}
                      className="text-[17px] font-semibold text-ink hover:opacity-70 transition-opacity"
                    >
                      {gen.input.appName}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px] text-ink-faint">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {variants.slice(0, 3).map((v) => {
                      const tile =
                        v.approach === "keyword"
                          ? "tile-blue"
                          : v.approach === "conversion"
                            ? "tile-cream"
                            : "tile-mint";
                      return (
                        <div
                          key={v.id}
                          className="p-4 rounded-xl bg-cream-deep"
                        >
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${tile}`}
                          >
                            {v.label}
                          </span>
                          <p className="text-[13px] font-semibold text-ink mt-2.5 line-clamp-2 leading-snug">
                            {v.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
