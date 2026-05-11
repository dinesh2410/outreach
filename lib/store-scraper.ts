// Scraper for Google Play / App Store listings. Imported only from API routes,
// which are server-only by construction.
//
// Extracts the current title, short description, and full description so the
// generator can produce alternatives that are genuinely different from what's live.
//
// The stores rate-limit aggressive scrapers and change layout periodically, so
// every parse path is best-effort. If a field can't be extracted, it's omitted
// rather than guessed.
//
// App Store: prefers the iTunes Lookup API (stable JSON endpoint), falls back
// to HTML parsing if that fails.
// Play Store: parses HTML — pulls the full description from the
// `<div data-g-id="description">` block (depth-tracked so nested divs don't
// truncate it), short description from <meta name="description">, and falls
// back to JSON-LD if the layout changes.

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

  if (source === "ios") {
    // Try iTunes Lookup first — it's a stable JSON endpoint that returns the
    // full description. Fall back to HTML scraping if it fails.
    const fromApi = await fetchAppStoreViaLookup(url).catch(() => null);
    if (fromApi) return fromApi;
    return fetchAppStoreViaHtml(url).catch(() => null);
  }

  return fetchPlayStoreViaHtml(url).catch(() => null);
}

async function fetchHtml(url: string): Promise<string | null> {
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
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Play Store -------------------------------------------------------------

async function fetchPlayStoreViaHtml(url: string): Promise<StoreListing | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  return parsePlayStore(html, url);
}

function parsePlayStore(html: string, url: string): StoreListing {
  const blocks = jsonLdBlocks(html);
  const ld = findInJsonLd(blocks, (o) => {
    const t = o["@type"];
    return t === "SoftwareApplication" || t === "MobileApplication";
  });

  const title =
    (typeof ld?.name === "string" ? ld.name : undefined) ??
    meta(html, "og:title")?.replace(/ - Apps on Google Play$/, "").trim();

  // Short description: the meta name="description" tag is set to the 80-char
  // Play "short description" field.
  const shortDesc = meta(html, "description")?.trim();

  // Full description: prefer the rendered <div data-g-id="description"> block.
  // Walk depth-tracked closing div so nested elements don't truncate the body.
  // Fall back to JSON-LD description only if it's clearly longer than the
  // short — Google often puts the *short* description in JSON-LD.
  const fromDom = extractMatchingDiv(html, /<div[^>]+data-g-id=["']description["'][^>]*>/i);
  let fullDesc: string | undefined;
  if (fromDom) {
    fullDesc = decodeEntities(stripTags(fromDom)).trim();
  }
  if (!fullDesc && typeof ld?.description === "string") {
    fullDesc = ld.description.trim();
  }
  // If the candidate "full" description is the same as (or shorter than) the
  // short description, treat it as the short and leave full unset.
  if (fullDesc && shortDesc && fullDesc.length <= shortDesc.length + 5) {
    fullDesc = undefined;
  }

  return { source: "play", url, title, shortDesc, fullDesc };
}

// Find a tag matching `openRe` and return the substring between its opening
// `>` and the matching `</tagName>`, respecting depth. Returns null if no
// match or the close cannot be found within the document.
function extractMatchingDiv(html: string, openRe: RegExp): string | null {
  const m = openRe.exec(html);
  if (!m) return null;
  const tagMatch = m[0].match(/^<\s*([a-zA-Z]+)/);
  if (!tagMatch) return null;
  const tag = tagMatch[1].toLowerCase();
  const openTagRe = new RegExp(`<${tag}\\b`, "gi");
  const closeTagRe = new RegExp(`</${tag}\\s*>`, "gi");

  const start = m.index + m[0].length;
  let depth = 1;
  let i = start;
  while (i < html.length && depth > 0) {
    openTagRe.lastIndex = i;
    closeTagRe.lastIndex = i;
    const o = openTagRe.exec(html);
    const c = closeTagRe.exec(html);
    if (!c) return null;
    if (o && o.index < c.index) {
      depth++;
      i = o.index + o[0].length;
    } else {
      depth--;
      if (depth === 0) {
        return html.slice(start, c.index);
      }
      i = c.index + c[0].length;
    }
  }
  return null;
}

// --- App Store --------------------------------------------------------------

async function fetchAppStoreViaLookup(url: string): Promise<StoreListing | null> {
  const ids = parseAppStoreIds(url);
  if (!ids?.appId) return null;

  const lookup = new URL("https://itunes.apple.com/lookup");
  lookup.searchParams.set("id", ids.appId);
  if (ids.country) lookup.searchParams.set("country", ids.country);
  lookup.searchParams.set("entity", "software");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(lookup.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = Array.isArray(data?.results) && data.results[0];
    if (!item) return null;
    const title = typeof item.trackName === "string" ? item.trackName : undefined;
    const fullDesc = typeof item.description === "string" ? item.description : undefined;
    return { source: "ios", url, title, fullDesc };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseAppStoreIds(url: string): { appId?: string; country?: string } | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const country = parts[0];
    const idPart = parts.find((p) => p.startsWith("id"));
    const appId = idPart?.slice(2);
    return { appId, country };
  } catch {
    return null;
  }
}

async function fetchAppStoreViaHtml(url: string): Promise<StoreListing | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  return parseAppStore(html, url);
}

function parseAppStore(html: string, url: string): StoreListing {
  const blocks = jsonLdBlocks(html);
  const ld = findInJsonLd(blocks, (o) => {
    const t = o["@type"];
    return t === "SoftwareApplication" || t === "MobileApplication";
  });

  const title =
    (typeof ld?.name === "string" ? ld.name : undefined) ??
    meta(html, "og:title")?.replace(/ on the App Store$/, "").trim();

  // Full description: try JSON-LD, then `.section__description`, then og.
  let fullDesc: string | undefined;
  if (typeof ld?.description === "string") {
    fullDesc = ld.description.trim();
  }
  if (!fullDesc) {
    const sec = extractMatchingDiv(html, /<section[^>]*class=["'][^"']*section__description[^"']*["'][^>]*>/i);
    if (sec) fullDesc = decodeEntities(stripTags(sec)).trim();
  }
  if (!fullDesc) {
    fullDesc = meta(html, "og:description")?.trim();
  }

  // Subtitle
  let subtitle: string | undefined;
  const subM = html.match(/<h2[^>]*class=["'][^"']*product-header__subtitle[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i);
  if (subM) {
    subtitle = decodeEntities(stripTags(subM[1])).trim() || undefined;
  }

  return { source: "ios", url, title, subtitle, fullDesc };
}

// --- shared helpers ---------------------------------------------------------

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

function stripTags(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
