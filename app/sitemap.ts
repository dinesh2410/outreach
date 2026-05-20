import type { MetadataRoute } from "next";

const BASE = "https://reachfront.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/score`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/generator`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/keywords`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/competitor`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/reddit`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/features`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/features/screenshots`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  return staticPages;
}
