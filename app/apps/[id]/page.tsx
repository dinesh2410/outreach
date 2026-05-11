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
      <AppShell eyebrow="Workspace · Apps" title="App not found">
        <Link href="/dashboard" className="link-arrow">
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
    { icon: Wand2, label: "Generations", value: app.generations.length, tile: "tile-blue" },
    { icon: Smartphone, label: "Platforms", value: [...platforms].join(", ") || "None", tile: "tile-lilac" },
    { icon: Clock, label: "Last edit", value: lastEdit, tile: "tile-mint" },
  ];

  return (
    <AppShell
      eyebrow={`Workspace · ${app.category}`}
      title={app.name}
      description={`Every variant, brief, and score you've recorded for ${app.name}.`}
      actions={
        <Link
          href="/generator"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
        >
          <Wand2 size={15} />
          New generation
        </Link>
      }
    >
      {/* App header */}
      <div className="card-soft p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl shrink-0" style={{ background: app.icon }} />
        <div>
          <p className="eyebrow">{app.category}</p>
          <p className="text-[18px] font-semibold text-ink mt-1">{app.name}</p>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {app.generations.length} generation{app.generations.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card-soft p-6 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`w-11 h-11 rounded-xl ${stat.tile} inline-flex items-center justify-center mb-4`}>
                <Icon size={18} strokeWidth={1.85} />
              </div>
              <p className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
                {stat.value}
              </p>
              <p className="text-[12px] text-ink-muted mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Generation history */}
      <h2 className="text-[22px] font-semibold tracking-[-0.01em] mb-5" style={{ color: "#0B3D7A" }}>
        Generation history
      </h2>
      {app.generations.length === 0 ? (
        <p className="text-[14px] text-ink-muted">No generations yet.</p>
      ) : (
        <div className="space-y-4">
          {app.generations.map((gen) => {
            const variants = gen.android || gen.ios || [];
            return (
              <div key={gen.id} className="card-soft p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] tile-blue">
                      {gen.android ? "Play Store" : "App Store"}
                    </span>
                    <span className="text-[12px] text-ink-faint">
                      {new Date(gen.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[12px] text-ink-faint capitalize">{gen.input.tone}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {variants.map((v) => {
                    const tile =
                      v.approach === "keyword"
                        ? "tile-blue"
                        : v.approach === "conversion"
                          ? "tile-cream"
                          : "tile-mint";
                    return (
                      <div key={v.id} className="p-4 rounded-xl bg-cream-deep">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${tile}`}>
                          {v.label}
                        </span>
                        <p className="text-[13px] font-semibold text-ink mt-2.5 line-clamp-2 leading-snug">
                          {v.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
