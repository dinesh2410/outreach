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
      eyebrow="Workspace · History"
      title={gen ? gen.input.appName : "Not found"}
      description={
        gen
          ? `Generated ${new Date(gen.createdAt).toLocaleString()} · ${gen.input.tone}`
          : undefined
      }
      actions={
        <Link
          href="/history"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
        >
          <ArrowLeft size={14} />
          Back to history
        </Link>
      }
    >
      {!gen ? (
        <div className="card-soft p-12 text-center">
          <p className="text-[15px] text-ink-muted">
            That generation isn&apos;t in your history. It may have been deleted.
          </p>
        </div>
      ) : (
        <ResultsState result={gen} onReset={() => router.push("/generator")} />
      )}
    </AppShell>
  );
}
