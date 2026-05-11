import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bell } from "lucide-react";
import { PublicNav } from "@/components/shared/PublicNav";
import { Footer } from "@/components/shared/Footer";
import { getFeature, FEATURES } from "@/lib/features";

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

const TILES = ["tile-blue", "tile-lilac", "tile-mint", "tile-cream", "tile-rose", "tile-peach"];

export default async function FeatureStubPage({ params }: PageProps) {
  const { slug } = await params;
  const feature = getFeature(slug);

  if (!feature || feature.status !== "soon") notFound();

  const Icon = feature.icon;
  const others = FEATURES.filter(
    (f) => f.slug !== feature.slug && f.status === "soon"
  );

  return (
    <>
      <PublicNav />
      <main className="pt-20">
        {/* Hero band */}
        <section style={{ backgroundColor: "#D7E5FB" }}>
          <div className="max-w-3xl mx-auto px-8 py-24 lg:py-32 text-center animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl tile-lilac mb-6">
              <Icon size={28} strokeWidth={1.85} />
            </div>
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-6"
              style={{ backgroundColor: "#FFF6E0", color: "#8A5A00" }}
            >
              Coming soon
            </span>
            <h1 className="text-[44px] lg:text-[60px] font-semibold text-ink leading-[1.05] tracking-[-0.02em]">
              {feature.name}
            </h1>
            <p className="mt-7 text-[17px] lg:text-[19px] text-ink leading-relaxed max-w-2xl mx-auto">
              {feature.description}
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-white text-[15px] font-medium hover:bg-night-soft transition-colors"
              >
                <Bell size={14} strokeWidth={2.25} />
                Get notified
                <ArrowRight size={14} strokeWidth={2.25} />
              </Link>
              <Link
                href="/generator"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-[1.5px] border-ink text-[15px] font-medium text-ink hover:bg-ink hover:text-white transition-colors"
              >
                Try the description generator
              </Link>
            </div>
          </div>
        </section>

        {/* Other coming-soon features */}
        {others.length > 0 && (
          <section className="bg-white">
            <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-28">
              <p className="eyebrow mb-8">Also on the way</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {others.map((f, i) => {
                  const FIcon = f.icon;
                  return (
                    <Link key={f.slug} href={f.href} className="group card-soft p-6">
                      <div
                        className={`w-11 h-11 rounded-xl ${TILES[i % TILES.length]} flex items-center justify-center mb-5`}
                      >
                        <FIcon size={20} strokeWidth={1.85} />
                      </div>
                      <h3 className="text-[16px] font-semibold text-ink mb-2 tracking-[-0.01em]">
                        {f.name}
                      </h3>
                      <p className="text-[14px] text-ink-muted leading-relaxed">
                        {f.tagline}
                      </p>
                      <span
                        className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold"
                        style={{ color: "#0B3D7A" }}
                      >
                        Learn more
                        <ArrowRight
                          size={13}
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
