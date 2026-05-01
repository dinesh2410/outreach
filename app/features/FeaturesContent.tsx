"use client";

import Link from "next/link";
import {
  Layers,
  Smartphone,
  Ruler,
  Pencil,
  LayoutGrid,
  Search,
  Copy,
  BookOpen,
  Camera,
  MessageSquare,
  BarChart3,
  Key,
  FileText,
  Palette,
  TrendingUp,
  Megaphone,
  Globe,
  ArrowRight,
} from "lucide-react";
import { useInView } from "@/lib/useInView";

const ASO_FEATURES = [
  { icon: Layers, title: "Three angles per generation", desc: "Keyword-optimized, conversion-focused, and brand-led variants in one click." },
  { icon: Smartphone, title: "Both stores supported", desc: "Android and iOS with correct character limits for each platform." },
  { icon: Ruler, title: "Live character counters", desc: "Title, short description, and full description limits enforced in real time." },
  { icon: Pencil, title: "Editable in place", desc: "Click any field to edit. Your changes, your voice, your final copy." },
  { icon: LayoutGrid, title: "Compare-all view", desc: "See all three variants side by side. Spot differences at a glance." },
  { icon: Search, title: "Keyword extraction", desc: "Top 10 keywords with frequency counts after every generation." },
  { icon: Copy, title: "Copy and download", desc: "Copy any field or export the whole thing as a .txt file." },
  { icon: BookOpen, title: "App library", desc: "Save generations and come back to them. Your history, organized." },
];

const COMING_SOON = [
  { icon: Camera, title: "Screenshot Generator", desc: "Generate store screenshots with text overlays and localize to multiple languages." },
  { icon: MessageSquare, title: "Reddit Replies", desc: "Find relevant threads and draft contextual, helpful responses." },
  { icon: BarChart3, title: "Competitor Analysis", desc: "Paste your app and a competitor URL. Get a side-by-side comparison." },
  { icon: Key, title: "Keyword Research", desc: "Discover and track keywords for your category and competitors." },
];

const GOOD_TO_HAVE = [
  { icon: FileText, title: "Privacy Policy Generator", desc: "Generate a compliant privacy policy for your app." },
  { icon: Palette, title: "Ad Creative Center", desc: "Create ad creatives for your campaigns without a designer." },
  { icon: TrendingUp, title: "Revenue Optimization", desc: "Human-in-the-loop revenue strategy for your app." },
  { icon: Megaphone, title: "Ad Agency Service", desc: "Managed paid campaigns for apps that need scale." },
  { icon: Globe, title: "Organic Marketing", desc: "Promotion across category-specific sites and communities." },
];

function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  index: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`p-6 rounded-3xl bg-surface border border-line hover:border-ink-faint transition-colors ${
        inView ? "animate-fade-up" : "opacity-0"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
        <Icon size={20} className="text-accent" />
      </div>
      <h3 className="font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
    </div>
  );
}

export function FeaturesContent() {
  return (
    <main>
      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-semibold text-ink">
            Built around the stores, not the AI.
          </h1>
          <p className="mt-6 text-lg text-ink-muted max-w-2xl mx-auto">
            Every feature exists because indie devs asked for it. Nothing is
            here to pad a list.
          </p>
        </div>
      </section>

      {/* Available now */}
      <section className="py-16 md:py-24 bg-cream-deep/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green/10 text-green text-sm font-mono mb-3">
              Available now
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-ink">
              ASO Description Generator
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ASO_FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Coming soon */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-sm font-mono mb-3">
              Coming soon
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-ink">
              More tools on the way
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMING_SOON.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Good to have */}
      <section className="py-16 md:py-24 bg-cream-deep/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ink/5 text-ink-faint text-sm font-mono mb-3">
              On the radar
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-ink">
              Good to have
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GOOD_TO_HAVE.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="bg-night rounded-3xl p-12">
            <h2 className="text-3xl font-semibold text-white">
              Ready to write a better listing?
            </h2>
            <p className="mt-4 text-white/60 max-w-lg mx-auto">
              Start with the description generator. Three drafts, under a
              minute.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-accent text-white font-semibold rounded-2xl hover:bg-accent-soft transition-colors"
            >
              Get started
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
