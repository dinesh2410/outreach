import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bell } from "lucide-react";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { getFeature, FEATURES } from "@/lib/features";

// Stub page for "Coming soon" features.
// Live features (generator, score) link directly to their real pages and
// don't pass through this route.

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return FEATURES.filter((f) => f.status === "soon").map((f) => ({
    slug: f.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return {};
  return {
    title: `${feature.name} — Outreach`,
    description: feature.description,
  };
}

export default async function FeatureStubPage({ params }: PageProps) {
  const { slug } = await params;
  const feature = getFeature(slug);

  // 404 if the slug doesn't match a known feature, or if it's a live feature
  // (live features have their own pages — don't render the "soon" stub for them).
  if (!feature || feature.status !== "soon") notFound();

  const Icon = feature.icon;
  const others = FEATURES.filter(
    (f) => f.slug !== feature.slug && f.status === "soon"
  );

  return (
    <>
      <PublicNav />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="max-w-3xl mx-auto px-6 text-center animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-6">
              <Icon size={28} className="text-accent" />
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-sm font-mono mb-6">
              Coming soon
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold text-ink leading-[1.1]">
              {feature.name}
            </h1>
            <p className="mt-6 text-lg text-ink-muted leading-relaxed">
              {feature.description}
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/auth" className="btn-pill-dark group">
                <Bell size={14} strokeWidth={2.5} />
                Get notified
                <span className="arrow-circle transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight size={14} strokeWidth={2.5} />
                </span>
              </Link>
              <Link href="/generator" className="btn-pill-light">
                Try the description generator
              </Link>
            </div>
          </div>
        </section>

        {/* Other coming-soon features */}
        {others.length > 0 && (
          <section className="py-16 md:py-20 bg-cream-deep/30">
            <div className="max-w-5xl mx-auto px-6">
              <p className="text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-6">
                Also on the way
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {others.map((f) => {
                  const FIcon = f.icon;
                  return (
                    <Link
                      key={f.slug}
                      href={f.href}
                      className="group p-6 rounded-2xl bg-surface border border-line hover:border-ink-faint transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                        <FIcon size={20} className="text-accent" />
                      </div>
                      <h3 className="font-semibold text-ink mb-1">{f.name}</h3>
                      <p className="text-sm text-ink-muted leading-relaxed">
                        {f.tagline}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent">
                        Learn more
                        <ArrowRight
                          size={12}
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
