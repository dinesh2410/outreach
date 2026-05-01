"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppNav } from "@/components/shared/AppNav";
import { useAuth } from "@/lib/auth";
import { Wand2, Smartphone, Clock } from "lucide-react";
import Link from "next/link";

export default function AppDetailPage() {
  const { user, apps } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (!user) router.push("/auth");
  }, [user, router]);

  if (!user) return null;

  const app = apps.find((a) => a.id === id);

  if (!app) {
    return (
      <>
        <AppNav />
        <main className="max-w-7xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-ink mb-4">App not found</h1>
          <Link href="/dashboard" className="text-accent hover:underline text-sm">
            Back to dashboard
          </Link>
        </main>
      </>
    );
  }

  const platforms = new Set<string>();
  app.generations.forEach((g) => {
    if (g.android) platforms.add("Android");
    if (g.ios) platforms.add("iOS");
  });

  const lastEdit = app.generations.length > 0
    ? new Date(app.generations[app.generations.length - 1].createdAt).toLocaleDateString()
    : "Never";

  const stats = [
    { icon: Wand2, label: "Generations", value: app.generations.length },
    { icon: Smartphone, label: "Platforms", value: [...platforms].join(", ") || "None" },
    { icon: Clock, label: "Last edit", value: lastEdit },
  ];

  return (
    <>
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* App card */}
        <div className="flex items-center gap-5 mb-8 animate-fade-up">
          <div
            className="w-16 h-16 rounded-2xl shrink-0"
            style={{ background: app.icon }}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-ink">{app.name}</h1>
            <p className="text-sm text-ink-muted">{app.category}</p>
          </div>
          <Link
            href="/generator"
            className="px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors text-sm"
          >
            New generation
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-5 rounded-3xl bg-surface border border-line animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Icon size={18} className="text-ink-faint mb-2" />
                <p className="text-xl font-semibold text-ink">{stat.value}</p>
                <p className="text-xs text-ink-muted mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Generation history */}
        <h2 className="text-lg font-semibold text-ink mb-4">Generation history</h2>
        {app.generations.length === 0 ? (
          <p className="text-sm text-ink-muted">No generations yet.</p>
        ) : (
          <div className="space-y-3">
            {app.generations.map((gen) => {
              const variants = gen.android || gen.ios || [];
              return (
                <div
                  key={gen.id}
                  className="p-5 rounded-2xl bg-surface border border-line"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-ink-faint">
                        {gen.android ? "Play Store" : "App Store"}
                      </span>
                      <span className="text-xs text-ink-faint">
                        {new Date(gen.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-ink-faint">
                      {gen.input.tone}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {variants.map((v) => (
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
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
