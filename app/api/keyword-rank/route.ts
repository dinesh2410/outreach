import { NextResponse } from "next/server";
import { rankKeyword, type RankStore } from "@/lib/keyword-rank";

// POST /api/keyword-rank { keyword, country?, lang?, store?, limit? }
//
// Returns a KeywordRankResult: ranked list of apps that surface in Play /
// App Store search for the keyword, in the order each store presented them.
//
// In-memory cached per (keyword, country, lang, store, limit) for 1 hour —
// see lib/keyword-rank.ts. fromCache=true on the response when served from
// cache so the UI can show the as-of timestamp accurately.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_STORES: RankStore[] = ["play", "ios", "both"];

export async function POST(req: Request) {
  let body: {
    keyword?: string;
    country?: string;
    lang?: string;
    store?: string;
    limit?: number;
    // Client-side IP-to-country fallback used when edge geo headers aren't
    // populated (local dev). Ignored if the edge already resolved the
    // country.
    clientCountry?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const keyword = body.keyword?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "Missing keyword" }, { status: 400 });
  }
  if (keyword.length > 100) {
    return NextResponse.json(
      { error: "keyword must be 100 characters or fewer" },
      { status: 400 }
    );
  }

  const storeRaw = body.store ?? "both";
  if (!ALLOWED_STORES.includes(storeRaw as RankStore)) {
    return NextResponse.json(
      { error: `store must be one of ${ALLOWED_STORES.join(", ")}` },
      { status: 400 }
    );
  }
  const store = storeRaw as RankStore;

  const rawCountry = (body.country ?? "us").toLowerCase();
  const lang = (body.lang ?? "en").toLowerCase();
  // "auto" → resolve from the user's edge-detected country (Vercel /
  // Cloudflare). Falls back to a client-supplied hint (set by the browser
  // via IP-to-country lookup — used in local dev where edge headers are
  // absent), and finally to "us" if nothing resolves. After resolution
  // we still require a 2-letter code.
  const clientHint = typeof body.clientCountry === "string"
    ? body.clientCountry.trim().toLowerCase()
    : null;
  const validClientHint = clientHint && /^[a-z]{2}$/.test(clientHint) ? clientHint : null;
  const country =
    rawCountry === "auto"
      ? (inferUserCountry(req) ?? validClientHint ?? "us")
      : rawCountry;
  if (!/^[a-z]{2}$/.test(country)) {
    return NextResponse.json({ error: "country must be a 2-letter code or 'auto'" }, { status: 400 });
  }
  if (!/^[a-z]{2}$/.test(lang)) {
    return NextResponse.json({ error: "lang must be a 2-letter code" }, { status: 400 });
  }

  const limit = body.limit;
  if (limit !== undefined && (typeof limit !== "number" || limit < 1 || limit > 30)) {
    return NextResponse.json({ error: "limit must be a number 1-30" }, { status: 400 });
  }

  try {
    const result = await rankKeyword({ keyword, country, lang, store, limit });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[keyword-rank] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch ranking" },
      { status: 500 }
    );
  }
}

// Pull the visitor's country from the edge headers Vercel / Cloudflare set.
// Returns a lowercase 2-letter ISO code, or null when unavailable.
function inferUserCountry(req: Request): string | null {
  const headers = req.headers;
  const raw =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country") ??
    null;
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : null;
}
