"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
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
      <AppShell title="App not found">
        <Link href="/dashboard" className="text-accent hover:underline text-sm">
          Back to dashboard
        </Link>
      </AppShell>
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
    <AppShell
      title={app.name}
      description={app.category}
      actions={
        <Link
          href="/generator"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <Wand2 size={14} />
          New generation
        </Link>
      }
    >
      {/* App icon */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-xl shrink-0"
          style={{ background: app.icon }}
        />
        <div>
          <p className="text-xs text-ink-faint uppercase tracking-wider">{app.category}</p>
          <p className="text-sm text-ink-muted">{app.generations.length} generation{app.generations.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
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
      <h2 className="text-sm font-semibold text-ink mb-3">Generation history</h2>
      {app.generations.length === 0 ? (
        <p className="text-sm text-ink-muted">No generations yet.</p>
      ) : (
        <div className="space-y-3">
          {app.generations.map((gen) => {
            const variants = gen.android || gen.ios || [];
            return (
              <div
                key={gen.id}
                className="p-5 rounded-xl bg-paper border border-line"
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
                      className="p-3 rounded-xl bg-cream border border-line-soft"
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
    </AppShell>
  );
}
