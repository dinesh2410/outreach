// Wrap an external store-icon URL with our /api/icon proxy.
//
// Why: Play Store icons live on play-lh.googleusercontent.com which is on
// many ad-blocker / corporate-firewall block lists (Google reuses the
// googleusercontent.com domain for ad imagery). When the browser fetch is
// blocked, the <img> falls back to our letter avatar. Routing through our
// same-origin proxy bypasses host-level blocking. The proxy hard-allows only
// Play + App Store icon CDNs — see app/api/icon/route.ts.
//
// Safe to call with any value: null/undefined/already-proxied URLs are
// returned unchanged.
export function proxiedIcon(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/api/icon?")) return url;
  if (!url.startsWith("https://")) return url;
  return `/api/icon?url=${encodeURIComponent(url)}`;
}
