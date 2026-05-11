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

type Feat = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  desc: string;
  tile: string;
};

const ASO_FEATURES: Feat[] = [
  { icon: Layers, title: "Three angles per generation", desc: "Keyword-optimized, conversion-focused, and brand-led variants in one click.", tile: "tile-blue" },
  { icon: Smartphone, title: "Both stores supported", desc: "Android and iOS with correct character limits enforced for each platform.", tile: "tile-lilac" },
  { icon: Ruler, title: "Live character counters", desc: "Title, short description, and full description limits enforced in real time.", tile: "tile-mint" },
  { icon: Pencil, title: "Editable in place", desc: "Click any field to edit. Your changes, your voice, your final copy.", tile: "tile-cream" },
  { icon: LayoutGrid, title: "Compare-all view", desc: "See all three variants side by side. Spot differences at a glance.", tile: "tile-rose" },
  { icon: Search, title: "Keyword extraction", desc: "Top 10 keywords with frequency counts after every generation.", tile: "tile-peach" },
  { icon: Copy, title: "Copy and download", desc: "Copy any field or export the whole thing as a .txt file.", tile: "tile-blue" },
  { icon: BookOpen, title: "App library", desc: "Save generations and come back to them. Your history, organized.", tile: "tile-lilac" },
];

const COMING_SOON: Feat[] = [
  { icon: Camera, title: "Screenshot Generator", desc: "Generate store screenshots with text overlays and localize to multiple languages.", tile: "tile-blue" },
  { icon: MessageSquare, title: "Reddit Replies", desc: "Find relevant threads and draft contextual, helpful responses.", tile: "tile-lilac" },
  { icon: BarChart3, title: "Competitor Analysis", desc: "Paste your app and a competitor URL. Get a side-by-side comparison.", tile: "tile-mint" },
  { icon: Key, title: "Keyword Research", desc: "Discover and track keywords for your category and competitors.", tile: "tile-cream" },
];

const GOOD_TO_HAVE: Feat[] = [
  { icon: FileText, title: "Privacy Policy Generator", desc: "Generate a compliant privacy policy for your app.", tile: "tile-blue" },
  { icon: Palette, title: "Ad Creative Center", desc: "Create ad creatives for your campaigns without a designer.", tile: "tile-lilac" },
  { icon: TrendingUp, title: "Revenue Optimization", desc: "Human-in-the-loop revenue strategy for your app.", tile: "tile-mint" },
  { icon: Megaphone, title: "Ad Agency Service", desc: "Managed paid campaigns for apps that need scale.", tile: "tile-cream" },
  { icon: Globe, title: "Organic Marketing", desc: "Promotion across category-specific sites and communities.", tile: "tile-rose" },
];

function FeatureCard({ icon: Icon, title, desc, tile, index }: Feat & { index: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`card-soft p-6 ${inView ? "animate-fade-up" : "opacity-0"}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`w-11 h-11 rounded-xl ${tile} flex items-center justify-center mb-5`}>
        <Icon size={20} strokeWidth={1.85} />
      </div>
      <h3 className="text-[16px] font-semibold text-ink mb-2 tracking-[-0.01em]">{title}</h3>
      <p className="text-[14px] text-ink-muted leading-relaxed">{desc}</p>
    </div>
  );
}

export function FeaturesContent() {
  return (
    <main className="pt-20">
      {/* Hero band */}
      <section style={{ backgroundColor: "#D7E5FB" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32 text-center">
          <p className="eyebrow mb-5">Platform · Every tool</p>
          <h1 className="text-[44px] lg:text-[64px] font-semibold text-ink leading-[1.05] tracking-[-0.02em] max-w-4xl mx-auto">
            Built around the stores, not the AI.
          </h1>
          <p className="mt-7 text-[17px] lg:text-[19px] text-ink leading-relaxed max-w-2xl mx-auto">
            Every feature exists because indie devs asked for it. Nothing is here to
            pad a list.
          </p>
        </div>
      </section>

      {/* Available now */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
          <div className="mb-12 max-w-2xl">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] text-white mb-5"
              style={{ backgroundColor: "#10B981" }}
            >
              Available now
            </span>
            <h2
              className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em]"
              style={{ color: "#0B3D7A" }}
            >
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
      <section style={{ backgroundColor: "#EFF4FE" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
          <div className="mb-12 max-w-2xl">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5"
              style={{ backgroundColor: "#FFF6E0", color: "#8A5A00" }}
            >
              Coming soon
            </span>
            <h2
              className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em]"
              style={{ color: "#0B3D7A" }}
            >
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
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
          <div className="mb-12 max-w-2xl">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 bg-cream-deep text-ink-muted"
            >
              On the radar
            </span>
            <h2
              className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em]"
              style={{ color: "#0B3D7A" }}
            >
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
      <section style={{ backgroundColor: "#D7E5FB" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-28 text-center">
          <h2 className="text-[40px] lg:text-[56px] font-semibold text-ink leading-[1.05] tracking-[-0.02em] max-w-3xl mx-auto">
            Ready to write a better listing?
          </h2>
          <p className="mt-6 text-[17px] text-ink max-w-xl mx-auto leading-relaxed">
            Start with the description generator — three drafts, under a minute.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 mt-10 px-6 py-3 rounded-full bg-ink text-white text-[15px] font-medium hover:bg-night-soft transition-colors"
          >
            Get started
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
