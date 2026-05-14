# Outreach — Work Log

**Project**: Outreach — the post-build platform for indie app makers
**Local**: `C:\Users\chdin\outreach`
**Repo**: https://github.com/dinesh2410/outreach (branch: `master`)
**Live**: https://outreach-psi-sooty.vercel.app
**Vercel project**: `testers-community1/outreach`
**Stack**: Next.js 16.2.4 (App Router) · Tailwind v4 · Vercel AI SDK + `@ai-sdk/google` · Gemini 2.5 Flash · Lucide icons

---

## Session — 2026-05-02 → 2026-05-03

### Hero (interactive workflow + layout)
- Replaced the static "tool nodes above headline" block with an interactive workflow behind the headline.
- 5 bubbles (Descriptions / Screenshots / Reddit / Competitor / Keywords) connected by a single smooth string (Catmull-Rom spline → cubic Bezier).
- Each bubble is **draggable**; on release, lerps back toward its anchor.
- **Magnetic attraction**: bubbles drift toward the cursor within 200px (quadratic falloff, ~50% max pull).
- Page-wide text selection locked while dragging (no more blue highlights when the pointer crosses the headline).
- Hero is `min-h-[90vh]` with vertically centered content.
- Workflow container offset to `top-16` so bubble percentages skip the nav row (no collision possible).
- Removed: "ASO Generator" pill badge and "Trusted by 10,000+ devs" row.

**Tuning knobs** (top of `HeroWorkflow.tsx`): `MAGNET_RADIUS`, `MAGNET_STRENGTH`, `LERP`. Anchor positions in `ANCHORS` array.

### Nav
- `PublicNav` switched from `sticky` → `fixed top-0` so the hero gradient extends behind it (continuous look).
- Subtle glass: `bg-cream/30 backdrop-blur-[6px]` — matches the ReadyLaunch reference.
- Replaced the plain "Features" link with a `FeaturesMenu` dropdown:
  - Hover or click to open. Outside-click + Escape to close.
  - Lists all 6 features with Live / Soon status pills.
  - Mobile drawer flattens the list.
- Driven by `lib/features.ts` (single source of truth).

### ASO Generator — real Gemini wiring
- `lib/generate.ts` (deterministic mock) → fetch wrapper to `/api/generate`.
- New API route under `app/api/generate/`:
  - `route.ts` — POST handler. Validates input, loops platforms, maps Gemini output → `Variant[]`.
  - `schema.ts` — Zod schemas (`VariantSchema`, `PlatformSchema`) + approach label map.
  - `prompt.ts` — **prompt builder. Edit voice / angles here.**
- Uses `@ai-sdk/google` + `generateObject` (Vercel AI SDK v6). Model: `gemini-2.5-flash`.
- `app/generator/page.tsx` — dropped the fake 2.4s setTimeout (real API has its own latency). Errors surface as toasts.
- Verified end-to-end locally **and** on production deployment.

**API key**: in `.env.local` (gitignored) and on Vercel (production scope). **Temporary personal Google AI Studio key — swap before launch.**

### Coming-soon stub pages
- `app/features/[slug]/page.tsx` — single dynamic route. Renders a Coming Soon stub for Screenshots / Reddit / Competitor / Keywords.
- Live slugs (`generator`, `score`) → 404 (their real pages own the routes).
- Driven by `lib/features.ts`.

### Sections below the hero
- **TrustedBy** — replaced text-list with LogoCloud3-style block:
  - Soft radial gradient backdrop.
  - Two-line headline (muted gray + solid).
  - Pure-CSS infinite marquee (no framer-motion). 40s loop, slows to 90s on hover.
  - Edge fades via `mask-image`.
  - **Honest framing**: app categories with icons, not fake brand logos.
- **FeatureShowcase** — replaced old `Showcase` with Hero195-adapted layout:
  - Tab bar (5 features), each with a lucide icon.
  - **Animated "border beam"** — rotating conic-gradient inside an `overflow-hidden` frame. No extra dep.
  - Background fading vertical guide-lines.
  - Reuses the existing `Mock*` components for tab content. Swap to real screenshots when ready.

### Code organization (split for findability)
- `Hero.tsx` (was 313 lines) → `Hero.tsx` (64) + `HeroWorkflow.tsx` (274)
- `app/api/generate/route.ts` (was 143) → `route.ts` (76) + `schema.ts` (34) + `prompt.ts` (47)

### Deploy
- Linked to Vercel as `testers-community1/outreach` (team scope).
- Env var `GOOGLE_GENERATIVE_AI_API_KEY` set in **production** environment.
- Production deployment: **https://outreach-psi-sooty.vercel.app** — `READY`.
- API smoke test post-deploy: passes.

---

## Session — 2026-05-05 (ASO generator quality sprint)

Six-task sprint to upgrade the generator output quality, then a layout polish round.

### Auth migrated mock → Upstash Redis (incomplete)
- `lib/auth.tsx` now talks to `/api/auth/login | signup | logout | me` instead of mock provider.
- New: `lib/redis.ts`, `lib/session.ts`, `lib/users-server.ts`, `app/api/auth/*`.
- **Blocker**: Upstash isn't connected yet. Without `KV_REST_API_URL` / `KV_REST_API_TOKEN` in `.env.local`, sign-in/sign-up returns "Database is not configured."
- **Temporary auth bypass** in `app/generator/page.tsx`: the redirect-to-`/auth` is commented out so the generator works without auth. Restore the redirect (lines 27-32) once Upstash is wired and `vercel env pull` is run.

### Task 1 — Clarifying questions feature
- New `/api/clarify` route + `lib/clarify.ts` + `components/generator/ClarifyingState.tsx`.
- New stage between input and generation: shows EXACTLY 3 dynamic questions (no chips, free-text textareas) tailored to the developer's specific input (not generic templates).
- Schema: `app/api/clarify/schema.ts` (length-3 array, no suggestions field).
- Prompt: `app/api/clarify/prompt.ts` — bans generic questions with explicit BAD/GOOD examples.
- Answers feed into `/api/generate` via `input.clarifications` (new field on `GeneratorInput`).
- Skip button still works; clarify failures fall through to direct generation.

### Task 2 — Schema hardening + committed keywords + per-tone definitions
- `app/api/generate/schema.ts` allows headroom (`title.max(45)`, `shortDesc.max(120)`, `subtitle.max(45)`, `fullDesc.max(4500)`); the route truncates to real platform limits (30 / 80 / 30 / 4000) cleanly.
- Why the headroom: Gemini consistently overran shortDesc by 4-10 chars in English; strict `.max(80)` was rejecting valid copy and 500-ing. Headroom + truncation > strict reject.
- Keyword variant now commits a `keywords[]` array (5-8 lowercase search terms). `Variant` type extended; `ResultsState` shows them as accent pills with copy button (above the action buttons in the editor card).
- Per-tone definitions baked into the prompt — `professional`/`casual`/`playful`/`minimal` each get a concrete writing-style spec in `TONE_DEFINITIONS`.

### Task 3 — ASO format research + codified template
- Researched consensus from Phiture, AppTweak, Adapty (sources logged in chat).
- Skeleton baked into `prompt.ts` as `SKELETON` constant: hook → blank → "WHAT IT DOES" paragraph → blank → ALL-CAPS HEADER + 3-6 bullets → blank → optional context section → blank → closing line.
- Platform-specific rules: Android allows emojis (≤3) + ASCII bullets; iOS no emoji, ASCII bullets only.
- All three variants ride the SAME skeleton; only the angle shifts (keyword/conversion/brand).
- Length sweet-spot: keyword/conversion 1500-2500 chars, brand 1200-1800 chars.

### Task 4 — Char counters + over-limit warnings in ResultsState
- Added `--color-warn: #DC2626` to `globals.css`.
- `charStatus()` helper in `ResultsState.tsx` replaces old `charColor()` — returns `{ text, bar, border, over }`.
- 3-stage color: green (safe) → gold (≥85%) → red (over limit).
- Slim 0.5px progress bar under each input.
- "X over limit" badge with AlertTriangle icon when over.
- **`maxLength` removed** from inputs so users can over-draft and see the warning fire (was the original task description's intent).

### Task 5 — Two-pass critique → revise
- After generation, the model gets its draft + format spec back via `buildRefinePrompt()` and rewrites weak parts.
- Sanity check: refine output must have 3 variants in keyword/conversion/brand order, else fall back to draft.
- Disable with `OUTREACH_REFINE=off` in `.env.local`. Doubles Gemini call count (matters on free tier — 20 req/min limit).

### Task 6 — Store URL scraping
- New `lib/store-scraper.ts` — fetches Play Store / App Store URLs, parses og: meta + JSON-LD + body HTML.
- Returns `{ source, title, shortDesc?, subtitle?, fullDesc }` or `null`. Failures silent.
- Hooked into `/api/generate` (single fetch, threaded through both passes).
- Prompt includes "current live listing" block with explicit "BE GENUINELY DIFFERENT" instruction.
- **Verified scraper on real URLs**: Play title + short desc OK, full desc falls back to short (Play hydrates client-side). iOS title + full desc (3200 chars) OK.

### Layout polish (post-sprint, in progress)
User wanted "exactly paste-ready, no editing". Hardened layout in two layers:

**Prompt-level:**
- `ANDROID_FORMAT` now says "PLAIN TEXT ONLY. Do NOT emit any HTML tags." — was `<b>`/`<h2>` allowed before, but the textarea showed raw tags as confusing garbage.
- Each bullet: `▶ ` + SHORT PHRASE IN CAPS + ` — ` + 1 sentence detail. Locked to `▶` (no mixing with `◉`/`–`).
- Section headers chosen from a fixed list ("FEATURES", "KEY FEATURES", "WHAT'S INSIDE", "HOW IT WORKS" / "WHO IT'S FOR", "BUILT BY", "BEHIND THE SCENES").
- Closing line MUST NOT say "Available on Play Store" / "Download now" / "Get started" — must be specific to the app.
- shortDesc/subtitle MUST be a complete thought ending with terminal punctuation. Title must be a complete name+descriptor (no partial phrases like "Todaywise: Intelligent").

**Server-level (route.ts):**
- `stripFormatting()` strips any leaked HTML / `**bold**` / `__bold__` and normalizes whitespace (3+ newlines → 2, trim per line, trim outer).
- `truncateClean()` always cuts at last word/sentence boundary — never mid-word (was producing "Plannin" from "Planning").
- `ensureCompleteSentence()` for shortDesc/subtitle: if no terminal punct → trim to last period; else last comma; else append period.
- `cleanTitle()` strips trailing `&`, `-`, `—`, `–`, `,`, `:`, `;`.

### Layout polish — known rough edges to resume on
1. **Conversion + Brand titles still come back as incomplete phrases** when the model overruns 30 chars — e.g. model writes "Todaywise: Intelligent Planner" (32), `truncateClean` cuts at word boundary → "Todaywise: Intelligent" (22), losing the noun. Fix: retry-on-overrun for titles instead of truncating. Schema headroom (`.max(45)`) means we get the over-30 title; we should reject and re-roll.
2. **Brand variant fullDesc opens with corporate-speak** — phrases like "unparalleled precision, intuitive insight, deeply intelligent understanding". Voice rule "Sound like a developer wrote it, not a marketing team" not always landing. Tighten in prompt — possibly add concrete BAD adjective-stack examples like the BAD/GOOD pattern used for titles and shortDesc.
3. **Brand variant occasionally drops the blank line** between `KEY FEATURES` header and the first bullet. Other variants keep it. Inconsistent. Could enforce in `stripFormatting()` by inserting a blank line after any all-caps single-word-line followed by a `▶` line.

### API key — rotated this session
- `.env.local` now has the new "company" Gemini key (replaced the personal/temporary one).
- **Old key still active** in Google AI Studio — should be deleted at https://aistudio.google.com/apikey.
- **Vercel production still has the old key** — needs `vercel env rm GOOGLE_GENERATIVE_AI_API_KEY production` then re-add.
- The new key was pasted in chat history (plaintext). If that's a concern for company-issued keys, rotate again via secure channel before launch.

### Verified end-to-end
- Plain text only — zero HTML / markdown leaks across multiple test runs.
- 3 variants with consistent skeleton (hook → bullets → context → close).
- Truncation never produces mid-word artifacts.
- shortDesc always ends with terminal punctuation.
- Refine pass works when not rate-limited; falls back to draft cleanly when it does fail.
- Store scraper works on real Play Store + App Store URLs.

---

## Session — 2026-05-05 (cont.) — Firebase migration

Replaced the broken Upstash Redis auth with Firebase Auth + Firestore persistence so the team can actually sign in and use the app.

### Firebase project
- Project: `outreach` (id: `outreach-5d0e4`), Spark plan ($0/month)
- Auth providers enabled: Email/Password + Google
- Firestore: Standard edition, production mode (security rules paste pending)

### Code wired (client-side, fully tested compile)
- New: `lib/firebase-client.ts` (browser SDK singleton — auth + firestore + google provider)
- New: `lib/firebase-admin.ts` (server SDK initializer — DORMANT, no route imports it yet)
- New: `lib/firestore.ts` — CRUD helpers for `users`, `apps`, `savedGenerations` under `/users/{uid}/...`
- New: `firestore.rules` (project root) — owner-only rules; needs to be pasted into Firebase Console
- Rewrote `lib/auth.tsx` — uses `onAuthStateChanged`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signInWithPopup` (Google), `signOut`. Hydrates apps + savedGenerations from Firestore on sign-in. Persists writes (saveGeneration / addApp / updateUser).
- Updated `app/auth/page.tsx` — added "Continue with Google" button at top of the form (real Google `<svg>` icon, not Lucide).
- Restored auth gate in `app/generator/page.tsx` — redirects to `/auth` if not signed in. Uses new `loading` flag from auth context to avoid flashing the redirect during initial state hydration.
- Deleted: `lib/redis.ts`, `lib/users-server.ts`, `lib/session.ts`, all of `app/api/auth/*` (4 routes).
- Uninstalled: `@upstash/redis`, `bcryptjs`, `jose`, `@types/bcryptjs`. Installed: `firebase` (12.12.1), `firebase-admin` (13.8.0).

### Env vars
- `NEXT_PUBLIC_FIREBASE_*` (6 vars) filled in `.env.local` — these are public by design (exposed to browser).
- `FIREBASE_PROJECT_ID` filled. `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` left empty — service account JSON was downloaded but values not yet pasted. Admin SDK is dormant, so this doesn't block client-side testing.

### What the user still needs to do (manually)
1. **Paste security rules** into Firebase Console → Firestore Database → Rules tab → contents of `firestore.rules` at the project root → Publish. Without this, signed-in users can theoretically read each other's data.
2. **Fill admin SDK env vars** from the service account JSON downloaded in Firebase Console → Project settings → Service accounts. Three fields: `project_id`, `client_email`, `private_key`. The `private_key` blob has literal `\n` strings in the JSON; the admin initializer (`lib/firebase-admin.ts`) already converts those to real newlines.
3. **Add `outreach-psi-sooty.vercel.app` to Firebase Authorized Domains** before deploying (Authentication → Settings → Authorized domains).
4. **Add the Firebase env vars to Vercel production** — same 9 vars (6 NEXT_PUBLIC_* + 3 FIREBASE_*). Vercel CLI not installed, so this is manual via Vercel dashboard.

### Smoke test status
- Dev server compiles clean ✓
- `/auth` and `/generator` return 200 ✓
- End-to-end auth + persistence flow NOT yet tested in browser — left for next session

---

## Session — 2026-05-13 (ASO scorer + generator rewrite from top-app corpus)

Replaced the fake `charSum%45` score in `lib/score.ts` with 17 listing-based checks driven by patterns extracted from 20 top Play Store apps (Google, Microsoft, Spotify, Duolingo, etc.).

**New checks**: title length/format, shortDesc verb-lead, hook opener pattern (one of three), • bullet char, Title-Case section labels, paragraph ≤4 sentences, benefit keyword coverage, no Download-now closing, emoji/exclamation discipline, brand repetition 3–8×.

`/api/audit` now passes the scraped listing to the scorer. Marketing `/score` page now calls `/api/audit` for real scores instead of URL hash.

Generator prompt (`app/api/generate/prompt.ts`) rewritten: bullets forced to •, hook opener locked to one of three patterns, ALL-CAPS headers dropped in favor of Title-Case labels, fullDesc target reduced to 2000–3000 chars (median 2539), pain-question openers forbidden, benefit lexicon provided.

**Sanity-checked**: Outlook scores 100/A, Gmail 95/A, Spotify 85/A, Chrome 64/C (correctly — Chrome has brand power, indie copying it would lose discoverability).

---

## Session — 2026-05-14 (Reddit Demand tool + hero dashboard pic + link audit)

### Reddit Demand validation tool
- New `/reddit` page in `AppShell`. User pastes an app idea → platform analyzes idea and surfaces Reddit posts where people are asking for, complaining about, or discussing that kind of app.
- Two-stage Gemini flow:
  1. **Plan** (`app/api/reddit/schema.ts`): extracts `problem`, `audience`, `primaryKeywords`, `subreddits`, `demandQueries` — each demand query is a Reddit-ready search string targeting demand signals ("is there an app", "wish there was", "alternative to", etc.).
  2. **Rank**: feeds top ~40 engagement-sorted posts to Gemini → returns `brief`, `demandScore` (0–100), `demandLabel`, `topThemes`, and up to 20 tagged `selectedPosts` (request / complaint / discussion).
- `lib/reddit.ts` — public JSON API client (`reddit.com/search.json`, no auth). Parallel multi-query, dedupes by post id, strips NSFW, tolerant of partial failure.
- Persistence: `RedditAnalysisRecord` → `/users/{uid}/redditAnalyses/{id}`. Id is djb2 hash of the idea text so re-running the same idea updates rather than duplicates. Full payload saved as `snapshot` for replay.

### Reddit page UI — Reddit-shaped, not report-shaped
- First pass had a giant circular score ring + report-style stat cards + brief panel + themes strip + grouped "Why it matters" boxes + a "How we searched" 3-column grid. User feedback: "I don't want it like a report, I want it like Reddit posts."
- Rewritten as a Reddit feed:
  - One-line verdict header — colored score chip + label + post count, brief flows underneath as prose
  - Sticky filter pills: All · Asking for it · Complaining · Talking about it (with counts)
  - Reddit-style post tiles — vote arrow + count on left rail (Reddit-orange `#FF4500` for ≥1K upvotes), `r/sub · u/author · time-ago` meta, large title in dark with hover lift, 3-line body excerpt, italic margin-note insight with left border, footer with comment count + "Open on Reddit"
  - Single-line footer: `Searched r/X, r/Y, r/Z using 6 demand queries.`

### Hero — replaced fake mosaic with real dashboard
- The old Hero right column was a hand-drawn mock (Generate/Library/Score sidebar with placeholder bars).
- Captured the real signed-in `/dashboard` via headless Chrome over CDP (`scripts/grab-dashboard.mjs`). Hidden scrollbars with `Emulation.setScrollbarsHidden` + injected CSS so the gutter doesn't bake into the PNG.
- Filename versioned as `public/hero/dashboard-v2.png` to bust the Next.js image-optimizer cache when re-grabbing.
- Hero right column is now a rounded card with a mac-style chrome bar (`outreach / dashboard`) + the dashboard `<Image>` + a single floating ASO Score card overlapping the bottom-left for depth.

### Link audit — fixed orphaned `/features/*` routes
- `/features/[slug]` is a "Coming soon" stub route; `notFound()` fires when the feature's status is `live`. So any link pointing to `/features/competitor` or `/features/keywords` was already returning 404 (those tools are live at `/competitor` and `/keywords`).
- Found and fixed:
  - Dashboard `ToolCard` for Reddit was `Soon` → `/features/reddit`. Now `Live` → `/reddit`.
  - `components/landing/BentoTools.tsx` `ROADMAP` row pointed all three items to `/features/*` stubs (which 404'd). Renamed to `ALSO_LIVE`, repointed to live routes, badges changed from "Soon" to "Live".
  - `lib/features.ts` Reddit entry flipped to `status: "live"`, `href: "/reddit"`. Cascades through the nav `Features ▾` dropdown and `/features` index page.
- Sidebar `Screenshots · Soon` entry kept as-is (still legitimately not built).
- Verified zero remaining references to `/features/reddit`, `/features/competitor`, `/features/keywords` anywhere in the codebase. The 404s on those URLs are now intentional dead URLs.

### Wiring extras
- Reddit analyses added to history timeline (`/history`) with `tile-lilac` and new filter chip.
- Global search (`AppShell.tsx`) indexes Reddit analyses → searchable by idea text + demand score.
- Firestore rule for `/redditAnalyses/{analysisId}` added — **user must republish** via Firebase Console.

### Smoke test
- All page routes return 200 except the three intentionally-orphaned `/features/{reddit,competitor,keywords}` stubs (404 by design).
- All API endpoints validate input (400 on bad payload, 200 on valid).
- `POST /api/reddit` with ADHD habit tracker idea returned `demandScore: 75 · High`, 15 relevant posts, brief correctly identifying "rigid streak-based apps fail for ADHD".

---

## Pending — from the design audit

Not yet acted on. Listed in priority order so we can come back to them.

1. **Cut fake stats** — `Stats.tsx` claims "40,000+ apps shipped, 10,000+ developers". `BRAND.md` says don't promise specific user numbers.
2. **Cut fake testimonials** — `Testimonials.tsx` has invented people and quotes. Same credibility problem.
3. **Section H2 copy** is generic in places ("Built different. On purpose.", "Built to scale, proven to perform.", "Five tools, one platform."). Tighten to the hero's dev-honest tone.
4. **Fonts** — `globals.css` sets both `--font-sans` and `--font-serif` to Geist. `DESIGN.md` calls for Outfit + Instrument Serif. User will add font wiring later.
5. **Section monotony** — every section is `centered eyebrow + H2 + grid`. Vary at least 2 layouts.
6. **Mocks vs real screenshots** — `BentoTools` and `FeatureShowcase` use `Mock*` components. Real screenshots from the working generator would be stronger.
7. **Hero overpromises** — claims "platform for everything after build", but body only talks about descriptions. Narrow the claim or broaden the body.
8. **Footer email** `hello@outreach.app` is a placeholder.

## Pending — infrastructure

- **Persistence** — nothing saves. Library is in-memory only. Roadmap defers DB.
- **Auth** — mocked (`lib/auth.tsx`). Real auth (Clerk / NextAuth / Supabase) deferred.
- **Real Gemini API key** — current key is personal; swap before launch.

---

## Where to find what

| To change... | Edit |
|---|---|
| Hero spacing, headline, CTAs | `components/landing/Hero.tsx` |
| Bubble positions, drag feel, magnet strength, string color | `components/landing/HeroWorkflow.tsx` (constants at top) |
| Feature catalog (drives dropdown + stubs) | `lib/features.ts` |
| Gemini prompt voice / angles | `app/api/generate/prompt.ts` |
| Output shape Gemini must produce | `app/api/generate/schema.ts` |
| Marquee categories or speed | `components/landing/TrustedBy.tsx` |
| Tab content / animated border | `components/landing/FeatureShowcase.tsx` |
| Nav transparency / glass tint | `components/shared/PublicNav.tsx` |
| Keyframes / animations | `app/globals.css` |

## Common commands

```bash
npm run dev                    # local dev server
vercel --prod                  # deploy to production (env var already set)
vercel env ls                  # list env vars
vercel logs <deployment-url>   # tail prod logs
```
