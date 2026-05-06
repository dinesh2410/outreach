"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
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
    <AppShell
      title={gen ? gen.input.appName : "Not found"}
      description={gen ? `Generated ${new Date(gen.createdAt).toLocaleString()} · ${gen.input.tone}` : undefined}
      actions={
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-line text-sm text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
        >
          <ArrowLeft size={14} />
          Back to history
        </Link>
      }
    >
      {!gen ? (
        <div className="p-12 rounded-xl bg-paper border border-line text-center">
          <p className="text-sm text-ink-muted">
            That generation isn&apos;t in your history. It may have been deleted.
          </p>
        </div>
      ) : (
        <ResultsState result={gen} onReset={() => router.push("/generator")} />
      )}
    </AppShell>
  );
}
