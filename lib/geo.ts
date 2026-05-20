// Client-side user-country detection.
//
// In production the API routes get the user's country from edge headers
// (x-vercel-ip-country, cf-ipcountry). In local dev those headers aren't
// set, so requests fall back to "us" — which means a user testing from
// India sees US Play Store results and misses regionally-available apps.
//
// This helper bridges that gap: the browser hits a free IP-to-country
// service, caches the result in localStorage for 24h, and the calling
// page sends the resolved code as a `clientCountry` hint on requests.
// The server still prefers its edge header (faster, more trusted), so
// production behavior is unchanged.

const CACHE_KEY = "outreach.userCountry";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PROVIDER_TIMEOUT_MS = 4000;

// Free, key-free, returns just `{ ip, country }`. Tried first because
// it's the smallest payload — no need to parse a full geo dump.
const PROVIDERS = [
  {
    url: "https://api.country.is",
    pick: (data: unknown): string | null => {
      const d = data as { country?: unknown };
      return typeof d.country === "string" ? d.country : null;
    },
  },
  {
    url: "https://ipapi.co/json/",
    pick: (data: unknown): string | null => {
      const d = data as { country_code?: unknown };
      return typeof d.country_code === "string" ? d.country_code : null;
    },
  },
];

interface CachedCountry {
  code: string;
  at: number;
}

function readCache(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCountry;
    if (!parsed.code || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.code.toLowerCase();
  } catch {
    return null;
  }
}

function writeCache(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ code: code.toLowerCase(), at: Date.now() } satisfies CachedCountry)
    );
  } catch {
    // Quota / private-mode failures are fine — we'll just re-detect next time.
  }
}

// In-flight promise so concurrent callers share the same network request.
let inflight: Promise<string | null> | null = null;

export async function detectUserCountry(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const cached = readCache();
  if (cached) return cached;

  if (inflight) return inflight;

  inflight = (async () => {
    for (const provider of PROVIDERS) {
      const code = await fetchWithTimeout(provider.url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => (data ? provider.pick(data) : null))
        .catch(() => null);
      if (code && /^[A-Za-z]{2}$/.test(code)) {
        const normalized = code.toLowerCase();
        writeCache(normalized);
        return normalized;
      }
    }
    return null;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// Optional: clear the cache (useful if the user changes location / network).
export function clearCachedCountry(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // best-effort
  }
}
