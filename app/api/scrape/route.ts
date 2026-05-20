import { fetchStoreListing, classifyStoreUrl } from "@/lib/store-scraper";

export const runtime = "nodejs";
export const maxDuration = 20;

// Lightweight scrape endpoint used by the generator's URL-input step.
// Returns ONLY the fields the form needs to prefill — title, shortDesc,
// fullDesc, genre. The audit endpoint also scrapes but does much more work
// (scoring, keyword extraction); this is a cheap pre-form lookup.
export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const source = classifyStoreUrl(url);
  if (!source) {
    return Response.json(
      { error: "URL must be a Google Play (play.google.com) or App Store (apps.apple.com) listing." },
      { status: 400 }
    );
  }

  const listing = await fetchStoreListing(url);
  if (!listing) {
    return Response.json(
      { error: "Could not scrape the listing. The store may be rate-limiting, or the page layout changed." },
      { status: 502 }
    );
  }

  return Response.json({
    source: listing.source,
    title: listing.title,
    shortDesc: listing.shortDesc,
    subtitle: listing.subtitle,
    fullDesc: listing.fullDesc,
    genre: listing.genre,
    developer: listing.developer,
    iconUrl: listing.iconUrl,
    rating: listing.rating,
    ratingCount: listing.ratingCount,
    downloads: listing.downloads,
    ratingHistogram: listing.ratingHistogram,
  });
}
