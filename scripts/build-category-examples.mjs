// One-time scraper: pulls icon images for 5 famous apps per category from
// the Google Play Store, downloads them into public/category-examples/,
// and writes data/category-examples.json with the manifest.
//
// Run with: node scripts/build-category-examples.mjs
// Re-run only when the example list changes — the form imports the JSON
// directly and serves icons from /category-examples/*.png.

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const OUT_IMG_DIR = path.join(ROOT, "public", "category-examples");
const OUT_JSON = path.join(ROOT, "data", "category-examples.json");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// 5 well-known apps per category, by Google Play package id.
// Chosen for breadth (popular + recognisable icon) and durability (apps
// unlikely to be delisted soon).
const APPS_BY_CATEGORY = {
  Productivity: [
    { name: "Notion", id: "notion.id" },
    { name: "Todoist", id: "com.todoist" },
    { name: "Trello", id: "com.trello" },
    { name: "Evernote", id: "com.evernote" },
    { name: "Microsoft To Do", id: "com.microsoft.todos" },
  ],
  "AI / ML": [
    { name: "ChatGPT", id: "com.openai.chatgpt" },
    { name: "Gemini", id: "com.google.android.apps.bard" },
    { name: "Perplexity", id: "ai.perplexity.app.android" },
    { name: "Copilot", id: "com.microsoft.copilot" },
    { name: "Character AI", id: "ai.character.app" },
  ],
  "Dev tools": [
    { name: "GitHub", id: "com.github.android" },
    { name: "Termux", id: "com.termux" },
    { name: "Pydroid 3", id: "ru.iiec.pydroid3" },
    { name: "Acode", id: "com.foxdebug.acodefree" },
    { name: "Termius", id: "com.server.auditor.ssh.client" },
  ],
  Game: [
    { name: "Candy Crush", id: "com.king.candycrushsaga" },
    { name: "Clash Royale", id: "com.supercell.clashroyale" },
    { name: "Subway Surfers", id: "com.kiloo.subwaysurf" },
    { name: "Among Us", id: "com.innersloth.spacemafia" },
    { name: "Brawl Stars", id: "com.supercell.brawlstars" },
  ],
  Social: [
    { name: "WhatsApp", id: "com.whatsapp" },
    { name: "Instagram", id: "com.instagram.android" },
    { name: "X", id: "com.twitter.android" },
    { name: "Discord", id: "com.discord" },
    { name: "Telegram", id: "org.telegram.messenger" },
  ],
  Lifestyle: [
    { name: "Pinterest", id: "com.pinterest" },
    { name: "Headspace", id: "com.getsomeheadspace.android" },
    { name: "Calm", id: "com.calm.android" },
    { name: "Reflectly", id: "com.reflectlyApp" },
    { name: "Habitica", id: "com.habitrpg.android.habitica" },
  ],
  Finance: [
    { name: "PayPal", id: "com.paypal.android.p2pmobile" },
    { name: "Cash App", id: "com.squareup.cash" },
    { name: "Revolut", id: "com.revolut.revolut" },
    { name: "Robinhood", id: "com.robinhood.android" },
    { name: "Venmo", id: "com.venmo" },
  ],
  "Health & fitness": [
    { name: "Strava", id: "com.strava" },
    { name: "MyFitnessPal", id: "com.myfitnesspal.android" },
    { name: "Nike Run Club", id: "com.nike.plusgps" },
    { name: "Fitbit", id: "com.fitbit.FitbitMobile" },
    { name: "Adidas Running", id: "com.runtastic.android" },
  ],
  Other: [
    { name: "Spotify", id: "com.spotify.music" },
    { name: "Netflix", id: "com.netflix.mediaclient" },
    { name: "YouTube", id: "com.google.android.youtube" },
    { name: "Google Maps", id: "com.google.android.apps.maps" },
    { name: "Gmail", id: "com.google.android.gm" },
  ],
};

const playUrl = (id) => `https://play.google.com/store/apps/details?id=${id}`;

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Play Store listings expose the icon URL in the meta og:image tag. We pull
// that, swap any size parameter for a stable 128px request.
function extractIconUrl(html) {
  const m = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (!m) return null;
  let url = m[1].replace(/=w\d+-h\d+/, "=w128-h128").replace(/=s\d+/, "=s128");
  return url;
}

async function downloadIcon(url, outPath) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(outPath, buf);
    return true;
  } catch (err) {
    console.warn(`  ✗ download failed: ${err.message}`);
    return false;
  } finally {
    clearTimeout(t);
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  if (!existsSync(OUT_IMG_DIR)) await mkdir(OUT_IMG_DIR, { recursive: true });
  if (!existsSync(path.dirname(OUT_JSON))) await mkdir(path.dirname(OUT_JSON), { recursive: true });

  const manifest = {};
  for (const [category, apps] of Object.entries(APPS_BY_CATEGORY)) {
    console.log(`[${category}]`);
    manifest[category] = [];
    for (const app of apps) {
      const slug = slugify(app.name);
      const imgFile = `${slugify(category)}-${slug}.png`;
      const imgPath = path.join(OUT_IMG_DIR, imgFile);
      const publicPath = `/category-examples/${imgFile}`;

      if (existsSync(imgPath)) {
        console.log(`  ✓ ${app.name} (cached)`);
        manifest[category].push({ name: app.name, icon: publicPath });
        continue;
      }

      const html = await fetchHtml(playUrl(app.id));
      if (!html) {
        console.warn(`  ✗ ${app.name}: scrape failed`);
        continue;
      }
      const iconUrl = extractIconUrl(html);
      if (!iconUrl) {
        console.warn(`  ✗ ${app.name}: no icon URL in HTML`);
        continue;
      }
      const ok = await downloadIcon(iconUrl, imgPath);
      if (ok) {
        console.log(`  ✓ ${app.name}`);
        manifest[category].push({ name: app.name, icon: publicPath });
      }
      // Be polite — 200ms between requests
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  await writeFile(OUT_JSON, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote manifest: ${OUT_JSON}`);
  const total = Object.values(manifest).reduce((n, arr) => n + arr.length, 0);
  console.log(`Total icons: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
