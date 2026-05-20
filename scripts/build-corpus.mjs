#!/usr/bin/env node
// Top-20-per-category corpus builder.
//
// Pulls the current top-20 free apps in 10 focus categories from both stores,
// fetches each listing, and writes the raw listings to data/corpus/raw/.
// Output feeds scripts/analyze-corpus.mjs which derives benchmarks for the
// scorer and generator.
//
// Categories: Productivity, Health & Fitness, Finance, Photo & Video,
// Social, Lifestyle, Education, Utilities, Business, Entertainment.
//
// iOS: legacy iTunes RSS for the top-N list, iTunes Lookup for each listing.
// Play: HTML scrape of the category page for the top-N list, then HTML scrape
// of each app's details page (mirrors lib/store-scraper.ts).
//
// Re-running is safe: per-category output files are overwritten on each run,
// so to refresh later just delete the file or run with --force.
//
// Usage:
//   node scripts/build-corpus.mjs                    # both stores, all categories
//   node scripts/build-corpus.mjs --store=ios        # one store only
//   node scripts/build-corpus.mjs --category=productivity
//   node scripts/build-corpus.mjs --force            # ignore existing files
//   node scripts/build-corpus.mjs --concurrency=4    # parallel per-app fetches

import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const RAW_DIR = join(PROJECT_ROOT, "data", "corpus", "raw");

// Focus categories — keys are our internal slugs (used in output filenames and
// in the benchmarks lookup), mapped to per-store identifiers.
const CATEGORIES = [
  { slug: "productivity",     ios: 6007, play: "PRODUCTIVITY" },
  { slug: "health_fitness",   ios: 6013, play: "HEALTH_AND_FITNESS" },
  { slug: "finance",          ios: 6015, play: "FINANCE" },
  { slug: "photo_video",      ios: 6008, play: "PHOTOGRAPHY" },
  { slug: "social",           ios: 6005, play: "SOCIAL" },
  { slug: "lifestyle",        ios: 6012, play: "LIFESTYLE" },
  { slug: "education",        ios: 6017, play: "EDUCATION" },
  { slug: "utilities",        ios: 6002, play: "TOOLS" },
  { slug: "business",         ios: 6000, play: "BUSINESS" },
  { slug: "entertainment",    ios: 6016, play: "ENTERTAINMENT" },
];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 15_000;
const TOP_N = 20;

// CLI args ------------------------------------------------------------------
const args = parseArgs(process.argv.slice(2));
const FORCE = args.force === true;
const CONCURRENCY = Number(args.concurrency ?? 3);
const STORE_FILTER = args.store ? String(args.store).toLowerCase() : null;
const CATEGORY_FILTER = args.category ? String(args.category).toLowerCase() : null;

// Main ----------------------------------------------------------------------
(async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  const cats = CATEGORIES.filter(
    (c) => !CATEGORY_FILTER || c.slug === CATEGORY_FILTER
  );
  if (cats.length === 0) {
    console.error(`No category matched "${CATEGORY_FILTER}".`);
    process.exit(1);
  }

  const stores = ["ios", "play"].filter((s) => !STORE_FILTER || s === STORE_FILTER);

  let totalApps = 0;
  for (const store of stores) {
    for (const cat of cats) {
      const outFile = join(RAW_DIR, `${store}_${cat.slug}.json`);
      if (!FORCE && (await fileExists(outFile))) {
        console.log(`[skip] ${store}/${cat.slug} — file exists (use --force to refresh)`);
        continue;
      }

      console.log(`\n[${store}/${cat.slug}] fetching top ${TOP_N}…`);
      const apps = store === "ios"
        ? await buildIosCategory(cat)
        : await buildPlayCategory(cat);

      if (apps.length === 0) {
        console.warn(`[${store}/${cat.slug}] empty — store returned nothing. Skipping.`);
        continue;
      }

      const payload = {
        store,
        category: cat.slug,
        fetchedAt: new Date().toISOString(),
        count: apps.length,
        apps,
      };
      await writeFile(outFile, JSON.stringify(payload, null, 2), "utf8");
      console.log(`[${store}/${cat.slug}] wrote ${apps.length} apps → ${outFile}`);
      totalApps += apps.length;
    }
  }

  console.log(`\nDone. Total apps written: ${totalApps}.`);
})().catch((err) => {
  console.error("Fatal:", err?.stack || err);
  process.exit(1);
});

// iOS pipeline --------------------------------------------------------------

async function buildIosCategory(cat) {
  // Legacy iTunes RSS is the most reliable way to enumerate top apps per
  // genre. It returns app IDs plus partial metadata; we re-fetch each via
  // iTunes Lookup to get the full description and ratings.
  const rssUrl = `https://itunes.apple.com/us/rss/topfreeapplications/limit=${TOP_N}/genre=${cat.ios}/json`;
  const rss = await fetchJson(rssUrl);
  const entries = rss?.feed?.entry ?? [];
  const ids = entries
    .map((e) => e?.id?.attributes?.["im:id"])
    .filter(Boolean);

  if (ids.length === 0) {
    console.warn(`[ios/${cat.slug}] no IDs from RSS`);
    return [];
  }

  // iTunes Lookup supports comma-separated IDs in one call. Use that to
  // minimize requests; chunk by 50 to stay well under URL length limits.
  const apps = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url = `https://itunes.apple.com/lookup?id=${chunk.join(",")}&country=us&entity=software`;
    const data = await fetchJson(url);
    for (const r of data?.results ?? []) {
      apps.push(normalizeIos(r, cat));
    }
  }

  // Preserve top-chart order using the RSS list as the source of truth.
  const order = new Map(ids.map((id, idx) => [String(id), idx]));
  apps.sort((a, b) => (order.get(a.appId) ?? 999) - (order.get(b.appId) ?? 999));

  return apps;
}

function normalizeIos(r, cat) {
  return {
    source: "ios",
    category: cat.slug,
    appId: String(r.trackId),
    url: r.trackViewUrl ?? `https://apps.apple.com/us/app/id${r.trackId}`,
    title: r.trackName ?? r.trackCensoredName,
    // iOS subtitle isn't returned by Lookup; we leave it undefined.
    shortDesc: undefined,
    subtitle: undefined,
    fullDesc: r.description ?? undefined,
    rating: typeof r.averageUserRating === "number" ? r.averageUserRating : undefined,
    ratingCount: typeof r.userRatingCount === "number" ? r.userRatingCount : undefined,
    developer: r.artistName,
    genre: r.primaryGenreName,
    iconUrl: r.artworkUrl512 ?? r.artworkUrl100,
    screenshotUrls: Array.isArray(r.screenshotUrls) ? r.screenshotUrls : [],
    lastUpdated: r.currentVersionReleaseDate ?? r.releaseDate,
    price: r.formattedPrice ?? (r.price === 0 ? "Free" : undefined),
    bundleId: r.bundleId,
    languageCodes: Array.isArray(r.languageCodesISO2A) ? r.languageCodesISO2A : [],
    inAppPurchaseTier: r.advisories?.length ? r.advisories : undefined,
    version: r.version,
    size: typeof r.fileSizeBytes === "string" ? Number(r.fileSizeBytes) : r.fileSizeBytes,
  };
}

// Play pipeline -------------------------------------------------------------

async function buildPlayCategory(cat) {
  // Scrape the category landing page for top app IDs. Play renders the page
  // server-side enough that the app detail links are present in the HTML.
  // We use the /top variant which Google still serves; if it ever 404s we
  // fall back to the unsuffixed page.
  const candidateUrls = [
    `https://play.google.com/store/apps/category/${cat.play}/top?hl=en&gl=us`,
    `https://play.google.com/store/apps/category/${cat.play}?hl=en&gl=us`,
  ];

  let html = null;
  for (const url of candidateUrls) {
    html = await fetchHtml(url).catch(() => null);
    if (html) break;
  }
  if (!html) {
    console.warn(`[play/${cat.slug}] category page fetch failed`);
    return [];
  }

  const ids = extractPlayAppIds(html).slice(0, TOP_N);
  if (ids.length === 0) {
    console.warn(`[play/${cat.slug}] no IDs extracted from category page`);
    return [];
  }

  console.log(`[play/${cat.slug}] resolved ${ids.length} ids; fetching listings…`);
  const apps = await mapLimit(ids, CONCURRENCY, async (id, idx) => {
    try {
      const listing = await fetchPlayListing(id);
      if (!listing) return null;
      return { ...listing, category: cat.slug, rank: idx + 1 };
    } catch (err) {
      console.warn(`  [play/${cat.slug}] ${id} failed: ${err.message}`);
      return null;
    }
  });

  return apps.filter(Boolean);
}

function extractPlayAppIds(html) {
  // App details URLs look like /store/apps/details?id=com.example.app — be
  // case-insensitive, dedupe in insertion order.
  const re = /\/store\/apps\/details\?id=([a-zA-Z0-9._-]+)/g;
  const seen = new Set();
  const ids = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

async function fetchPlayListing(appId) {
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=en&gl=us`;
  const html = await fetchHtml(url);
  if (!html) return null;

  // Title — Play prints it in og:title meta. Strips trailing " - Apps on Google Play".
  let title = pickMeta(html, "og:title") ?? pickFirst(html, /<h1[^>]*itemprop="name"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/);
  if (title) title = title.replace(/\s*[-–]\s*Apps on Google Play\s*$/i, "").trim();

  // Short description — og:description usually carries it.
  const shortDesc = pickMeta(html, "og:description") ?? pickMeta(html, "description");

  // Full description — Play wraps it in <div data-g-id="description"> ... </div>.
  // Depth-balanced extraction so a nested <div> doesn't truncate.
  const fullDesc = extractPlayFullDesc(html);

  // Rating — Play exposes it in JSON-LD AggregateRating or in itemprop attrs.
  const { rating, ratingCount } = extractPlayRating(html);

  // Developer / genre / icon / screenshots / lastUpdated — pull what we can,
  // best-effort. Missing fields stay undefined; the analyzer tolerates this.
  const developer = pickFirst(html, /"\/store\/apps\/dev(?:eloper)?[^"]*"[^>]*>([^<]+)</);
  const iconUrl = pickFirst(html, /<img[^>]+alt="Icon image"[^>]+src="([^"]+)"/)
    ?? pickMeta(html, "og:image");

  // Screenshots — collect from og:image-style preview imagery in
  // play-lh.googleusercontent.com hosted images on the page. We dedupe and
  // strip any duplicate-of-icon entries.
  const screenshotUrls = extractPlayScreenshots(html, iconUrl);

  const lastUpdated = extractPlayLastUpdated(html);

  return {
    source: "play",
    appId,
    url,
    title: title ? decodeEntities(title) : undefined,
    shortDesc: shortDesc ? decodeEntities(shortDesc) : undefined,
    subtitle: undefined,
    fullDesc: fullDesc ? decodeEntities(fullDesc) : undefined,
    rating,
    ratingCount,
    developer: developer ? decodeEntities(developer) : undefined,
    genre: undefined, // Play category is provided externally
    iconUrl,
    screenshotUrls,
    lastUpdated,
    price: "Free",
    bundleId: appId,
    languageCodes: [],
    version: undefined,
    size: undefined,
  };
}

function extractPlayFullDesc(html) {
  // Find the description block. Play has experimented with several wrappers;
  // try each in order, returning the first one that yields meaningful text.
  const candidates = [
    /<div[^>]*data-g-id="description"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/,
    /<div[^>]+jsname="sngebd"[^>]*>([\s\S]*?)<\/div>/,
    /"description":"((?:[^"\\]|\\.){50,})"/, // JSON-LD escape — > 50 chars to skip short ones
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (!m) continue;
    let text = m[1];
    // For the JSON-LD candidate, undo escapes.
    if (re.source.startsWith('"description"')) {
      text = text.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else {
      // Strip HTML; preserve line breaks from <br> and block-level boundaries.
      text = text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, "");
    }
    text = decodeEntities(text).replace(/\r/g, "").trim();
    if (text.length > 200) return text;
  }
  return undefined;
}

function extractPlayRating(html) {
  // JSON-LD AggregateRating first.
  const ldMatch = html.match(/"aggregateRating"\s*:\s*\{([^}]+)\}/);
  if (ldMatch) {
    const block = ldMatch[1];
    const r = /"ratingValue"\s*:\s*"?([\d.]+)"?/.exec(block)?.[1];
    const c = /"ratingCount"\s*:\s*"?([\d]+)"?/.exec(block)?.[1];
    return {
      rating: r ? Number(r) : undefined,
      ratingCount: c ? Number(c) : undefined,
    };
  }
  // Fallback: in-page text "4.5 star" + "1.2M reviews".
  const r2 = /(\d\.\d)\s*star/i.exec(html)?.[1];
  return { rating: r2 ? Number(r2) : undefined, ratingCount: undefined };
}

function extractPlayScreenshots(html, iconUrl) {
  // Collect candidate Google-hosted images, dedupe; drop the icon if it
  // shows up. Order is page order.
  const re = /https:\/\/play-lh\.googleusercontent\.com\/[A-Za-z0-9_\-]+(?:=[^"]*)?/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const stripped = m[0].split("=")[0]; // drop sizing suffix for dedup
    if (seen.has(stripped)) continue;
    seen.add(stripped);
    if (iconUrl && m[0].startsWith(iconUrl.split("=")[0])) continue;
    out.push(m[0]);
  }
  return out.slice(0, 12);
}

function extractPlayLastUpdated(html) {
  // Play shows "Updated on Mmm DD, YYYY" near the metadata block.
  const m = html.match(/Updated on<\/div><div[^>]*>([^<]+)</)
    ?? html.match(/Updated on\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/);
  if (!m) return undefined;
  const t = Date.parse(m[1]);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

// ---------------------------------------------------------------------------

async function fetchJson(url) {
  const res = await fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchHtml(url) {
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchWithTimeout(url, opts) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function pull() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, pull));
  return results;
}

function pickMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapeRegex(name)}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  return html.match(re)?.[1];
}

function pickFirst(html, re) {
  return html.match(re)?.[1];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq === -1) out[a.slice(2)] = true;
    else out[a.slice(2, eq)] = a.slice(eq + 1);
  }
  return out;
}
