// Scraper for Google Play / App Store listings. Imported only from API routes,
// which are server-only by construction.
//
// Extracts the current title, short description, and full description so the
// generator can produce alternatives that are genuinely different from what's live.
//
// The stores rate-limit aggressive scrapers and change layout periodically, so
// every parse path is best-effort. If a field can't be extracted, it's omitted
// rather than guessed. The generator falls back to behaving as if no URL was given.

export type StoreSource = "play" | "ios";

export interface StoreListing {
  source: StoreSource;
  url: string;
  title?: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc?: string;
}

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export function classifyStoreUrl(url: string): StoreSource | null {
  try {
    const u = new URL(url);
    if (u.hostname === "play.google.com" && u.pathname.startsWith("/store/apps/details")) {
      return "play";
    }
    if (u.hostname === "apps.apple.com" || u.hostname === "itunes.apple.com") {
      return "ios";
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchStoreListing(url: string): Promise<StoreListing | null> {
  const source = classifyStoreUrl(url);
  if (!source) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return source === "play" ? parsePlayStore(html, url) : parseAppStore(html, url);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// --- parsing helpers --------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function meta(html: string, key: string): string | undefined {
  // Match either name= or property= forms.
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapeRe(key)}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escapeRe(key)}["']`,
    "i"
  );
  const m = html.match(re) ?? html.match(alt);
  if (!m) return undefined;
  const value = decodeEntities(m[1]).trim();
  return value || undefined;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      // Some pages embed multiple objects or trailing junk — skip silently.
    }
  }
  return out;
}

function findInJsonLd(blocks: unknown[], pred: (o: Record<string, unknown>) => boolean): Record<string, unknown> | null {
  function walk(node: unknown): Record<string, unknown> | null {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (pred(obj)) return obj;
      for (const v of Object.values(obj)) {
        const found = walk(v);
        if (found) return found;
      }
    }
    return null;
  }
  for (const b of blocks) {
    const found = walk(b);
    if (found) return found;
  }
  return null;
}

// --- Play Store -------------------------------------------------------------

function parsePlayStore(html: string, url: string): StoreListing {
  const blocks = jsonLdBlocks(html);
  const ld = findInJsonLd(blocks, (o) => {
    const t = o["@type"];
    return t === "SoftwareApplication" || t === "MobileApplication";
  });

  const title =
    (typeof ld?.name === "string" ? ld.name : undefined) ??
    meta(html, "og:title")?.replace(/ - Apps on Google Play$/, "").trim();

  const shortDesc = meta(html, "description")?.trim();

  // Full description lives in <div data-g-id="description"> ... </div> on current Play layout,
  // and inside the JSON-LD `description` field.
  let fullDesc: string | undefined;
  if (typeof ld?.description === "string") {
    fullDesc = ld.description.trim();
  }
  if (!fullDesc) {
    const m = html.match(/<div[^>]+data-g-id=["']description["'][^>]*>([\s\S]*?)<\/div>/i);
    if (m) {
      fullDesc = decodeEntities(stripTags(m[1])).trim();
    }
  }

  return { source: "play", url, title, shortDesc, fullDesc };
}

// --- App Store --------------------------------------------------------------

function parseAppStore(html: string, url: string): StoreListing {
  const blocks = jsonLdBlocks(html);
  const ld = findInJsonLd(blocks, (o) => {
    const t = o["@type"];
    return t === "SoftwareApplication" || t === "MobileApplication";
  });

  const title =
    (typeof ld?.name === "string" ? ld.name : undefined) ??
    meta(html, "og:title")?.replace(/ on the App Store$/, "").trim();

  // App Store uses og:description for a short blurb. The full description sits in
  // the rendered HTML under `.section__description`. Fall back to og:description.
  let fullDesc: string | undefined;
  if (typeof ld?.description === "string") {
    fullDesc = ld.description.trim();
  }
  if (!fullDesc) {
    const m = html.match(/<section[^>]*class=["'][^"']*section__description[^"']*["'][^>]*>([\s\S]*?)<\/section>/i);
    if (m) {
      fullDesc = decodeEntities(stripTags(m[1])).trim();
    }
  }
  if (!fullDesc) {
    fullDesc = meta(html, "og:description")?.trim();
  }

  // Subtitle is sometimes in <h2 class="product-header__subtitle">.
  let subtitle: string | undefined;
  const subM = html.match(/<h2[^>]*class=["'][^"']*product-header__subtitle[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i);
  if (subM) {
    subtitle = decodeEntities(stripTags(subM[1])).trim() || undefined;
  }

  return { source: "ios", url, title, subtitle, fullDesc };
}

function stripTags(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
