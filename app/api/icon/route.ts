import { NextResponse } from "next/server";

// GET /api/icon?url={encoded}
//
// Proxies store app icons through our own origin so client-side host-level
// blocking (uBlock Origin, corporate firewalls, etc. — googleusercontent.com
// is on many default block lists because Google uses it for ad imagery)
// doesn't break the UI. The browser fetches /api/icon/... from same-origin,
// and our server does the upstream call.
//
// Security: hard-whitelist the upstream hosts so this can't be abused as an
// open proxy. Both stores' icon CDNs are well-known.

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const ALLOWED_HOSTS = new Set([
  "play-lh.googleusercontent.com",  // Play Store icons
  "is1-ssl.mzstatic.com",           // App Store icons
  "is2-ssl.mzstatic.com",
  "is3-ssl.mzstatic.com",
  "is4-ssl.mzstatic.com",
  "is5-ssl.mzstatic.com",
]);

const FETCH_TIMEOUT_MS = 8_000;
// 1-day browser cache + 7-day CDN cache. Icons rarely change, and if they do
// Play/Apple change the URL hash so a stale cache hit is harmless.
const CACHE_HEADER = "public, max-age=86400, s-maxage=604800, immutable";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only https upstreams are allowed" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json(
      { error: `Host ${parsed.hostname} is not allowed` },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        // Don't forward our app's referer — keeps Play's CDN happy regardless
        // of whether they ever enforce hotlink protection.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "image/webp,image/png,image/jpeg,image/*",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/webp";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_HEADER,
        // Allow embedding from anywhere — our pages render these in <img>.
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (err) {
    console.warn("[icon-proxy] fetch failed:", url, err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
