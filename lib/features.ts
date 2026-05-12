import {
  FileText,
  Activity,
  Camera,
  MessageSquare,
  BarChart3,
  Key,
  type LucideIcon,
} from "lucide-react";

// Single source of truth for the product's features.
// Used by:
//   - components/shared/FeaturesMenu.tsx — the nav dropdown
//   - app/features/[slug]/page.tsx — the "Coming soon" stub pages
//
// Order in this array = order in the dropdown.

export type FeatureSlug =
  | "generator"
  | "score"
  | "screenshots"
  | "reddit"
  | "competitor"
  | "keywords";

export type FeatureStatus = "live" | "soon";

export interface Feature {
  slug: FeatureSlug;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  status: FeatureStatus;
  href: string;
}

export const FEATURES: Feature[] = [
  {
    slug: "generator",
    name: "ASO Description Generator",
    tagline: "Three angles per generation",
    description:
      "Keyword-optimized, conversion-focused, and brand-led variants for both stores in one click.",
    icon: FileText,
    status: "live",
    href: "/generator",
  },
  {
    slug: "score",
    name: "ASO Score Checker",
    tagline: "Audit your listing",
    description:
      "Paste your store text and get a deterministic score with actionable improvements.",
    icon: Activity,
    status: "live",
    href: "/score",
  },
  {
    slug: "screenshots",
    name: "Screenshot Generator",
    tagline: "Store screenshots with localization",
    description:
      "Generate store screenshots with text overlays and localize them to multiple languages.",
    icon: Camera,
    status: "soon",
    href: "/features/screenshots",
  },
  {
    slug: "reddit",
    name: "Reddit Replies",
    tagline: "Find threads, draft responses",
    description:
      "Find relevant threads in your category and draft contextual, helpful responses.",
    icon: MessageSquare,
    status: "soon",
    href: "/features/reddit",
  },
  {
    slug: "competitor",
    name: "Competitor Watch",
    tagline: "Find and analyze competitors",
    description:
      "Paste your app URL — we'll auto-discover competitors (or use the ones you list) and give you a side-by-side breakdown with ratings, primary keywords, and overlap.",
    icon: BarChart3,
    status: "live",
    href: "/competitor",
  },
  {
    slug: "keywords",
    name: "Keyword Rank Checker",
    tagline: "Live App Store + Play rankings",
    description:
      "Type a keyword and see which apps surface in the App Store and Play Store search ranking — with country selector, store toggle, and saved history.",
    icon: Key,
    status: "live",
    href: "/keywords",
  },
];

export function getFeature(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}
