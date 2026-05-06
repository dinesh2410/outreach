"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/shared/AppNav";
import { useAuth } from "@/lib/auth";
import { ResultsState } from "@/components/generator/ResultsState";
import { ArrowLeft } from "lucide-react";

export default function HistoryDetailPage() {
  const { user, loading, history } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const gen = history.find((g) => g.id === id);

  return (
    <>
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to history
        </Link>

        {!gen ? (
          <div className="p-12 rounded-3xl bg-surface border border-line text-center">
            <h1 className="text-2xl font-semibold text-ink mb-2">Not found</h1>
            <p className="text-sm text-ink-muted">
              That generation isn&apos;t in your history. It may have been deleted.
            </p>
          </div>
        ) : (
          <ResultsState result={gen} onReset={() => router.push("/generator")} />
        )}
      </main>
    </>
  );
}
