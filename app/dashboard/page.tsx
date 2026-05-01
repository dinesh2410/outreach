"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppNav } from "@/components/shared/AppNav";
import { useAuth } from "@/lib/auth";
import { Wand2, AppWindow, FileText, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, apps, savedGenerations } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/auth");
  }, [user, router]);

  if (!user) return null;

  const totalGens = apps.reduce((sum, a) => sum + a.generations.length, 0);
  const lastActivity =
    savedGenerations.length > 0
      ? new Date(savedGenerations[savedGenerations.length - 1].createdAt).toLocaleDateString()
      : "No activity yet";

  const stats = [
    { icon: AppWindow, label: "Apps", value: apps.length },
    { icon: FileText, label: "Generations", value: totalGens },
    { icon: Wand2, label: "Saved drafts", value: savedGenerations.length },
    { icon: Clock, label: "Last activity", value: lastActivity },
  ];

  return (
    <>
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-ink animate-fade-up">
          Hello, {user.firstName}.
        </h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-5 rounded-3xl bg-surface border border-line animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Icon size={20} className="text-ink-faint mb-3" />
                <p className="text-2xl font-semibold text-ink">{stat.value}</p>
                <p className="text-xs text-ink-muted mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* New generation CTA */}
        <div className="mt-8 animate-fade-up delay-400">
          <Link
            href="/generator"
            className="block bg-night rounded-3xl p-8 md:p-10 hover:bg-night-soft transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  New generation
                </h2>
                <p className="text-white/60 mt-1">
                  Generate three ASO description variants for your app.
                </p>
              </div>
              <ArrowRight
                size={24}
                className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all"
              />
            </div>
          </Link>
        </div>

        {/* Apps grid */}
        {apps.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-ink mb-4">Your apps</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  href={`/apps/${app.id}`}
                  className="p-5 rounded-3xl bg-surface border border-line hover:border-ink-faint transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl shrink-0"
                      style={{ background: app.icon }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">
                        {app.name}
                      </p>
                      <p className="text-xs text-ink-faint">{app.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {app.generations.length} generation
                    {app.generations.length !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
