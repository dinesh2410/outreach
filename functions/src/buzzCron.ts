import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { searchRedditMany, fetchAndMatchKeywords, type RedditSearchOptions, type RedditPost } from "./reddit";
import { djb2, postToMention, keywordInPost, type BuzzTracker, type BuzzMention } from "./helpers";

interface TrackerEntry {
  uid: string;
  trackerId: string;
  tracker: BuzzTracker;
}

const DELAY_BETWEEN_KEYWORDS_MS = 1500;

export const buzzCron = onSchedule(
  {
    schedule: "every 2 hours",
    timeoutSeconds: 540,
    memory: "512MiB",
    region: "us-central1",
  },
  async () => {
    const start = Date.now();
    const db = getFirestore();

    // ── Phase A: Collect all enabled trackers and build keyword→tracker map ──

    const snapshot = await db
      .collectionGroup("buzzTrackers")
      .where("enabled", "==", true)
      .get();

    if (snapshot.empty) {
      console.log("[buzzCron] No enabled trackers found. Exiting.");
      return;
    }

    const keywordToTrackers = new Map<string, TrackerEntry[]>();
    const allSubreddits = new Set<string>();
    const trackerEntries: TrackerEntry[] = [];

    for (const doc of snapshot.docs) {
      const pathParts = doc.ref.path.split("/");
      const uid = pathParts[1];
      const tracker = doc.data() as BuzzTracker;

      const entry: TrackerEntry = { uid, trackerId: tracker.id, tracker };
      trackerEntries.push(entry);

      for (const kw of tracker.keywords) {
        const kwLower = kw.toLowerCase();
        if (!keywordToTrackers.has(kwLower)) {
          keywordToTrackers.set(kwLower, []);
        }
        keywordToTrackers.get(kwLower)!.push(entry);
      }

      if (tracker.subreddits) {
        for (const sub of tracker.subreddits) {
          allSubreddits.add(sub);
        }
      }
    }

    const uniqueKeywords = Array.from(keywordToTrackers.keys());
    console.log(
      `[buzzCron] Found ${trackerEntries.length} trackers, ${uniqueKeywords.length} unique keywords, ${allSubreddits.size} unique subreddits`,
    );

    // ── Phase B: Batch scrape Reddit ──

    const allPosts = new Map<string, RedditPost>();
    const errors: string[] = [];

    // Search keywords in batches of 5 to avoid hammering Reddit
    for (let i = 0; i < uniqueKeywords.length; i += 5) {
      if (Date.now() - start > 450_000) {
        console.warn(`[buzzCron] Time budget hit during keyword search at keyword ${i}/${uniqueKeywords.length}`);
        break;
      }

      const batch = uniqueKeywords.slice(i, i + 5);
      const queries: RedditSearchOptions[] = batch.map((kw) => ({
        query: kw,
        sort: "new" as const,
        t: "day" as const,
        limit: 25,
      }));

      try {
        const posts = await searchRedditMany(queries);
        for (const post of posts) {
          if (!allPosts.has(post.id)) allPosts.set(post.id, post);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[buzzCron] Keyword batch failed:`, msg);
        errors.push(msg);
      }

      if (i + 5 < uniqueKeywords.length) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_KEYWORDS_MS));
      }
    }

    // Fetch subreddit feeds
    if (allSubreddits.size > 0 && Date.now() - start < 450_000) {
      try {
        const subKeywords = uniqueKeywords;
        const feedPosts = await fetchAndMatchKeywords(
          Array.from(allSubreddits),
          subKeywords,
          100,
        );
        for (const post of feedPosts) {
          if (!allPosts.has(post.id)) allPosts.set(post.id, post);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[buzzCron] Subreddit feeds failed:`, msg);
        errors.push(msg);
      }
    }

    console.log(`[buzzCron] Scraped ${allPosts.size} unique posts in ${Math.round((Date.now() - start) / 1000)}s`);

    if (allPosts.size === 0) {
      console.log("[buzzCron] No posts found. Updating lastCheckedAt and exiting.");
      const emptyBatch = db.batch();
      for (const entry of trackerEntries) {
        const ref = db.doc(`users/${entry.uid}/buzzTrackers/${entry.trackerId}`);
        emptyBatch.update(ref, { lastCheckedAt: new Date().toISOString() });
      }
      await emptyBatch.commit();
      return;
    }

    // ── Phase C: Distribute results to trackers ──

    // For each post, find which keywords match, then find which trackers care
    const mentionsByUser = new Map<string, BuzzMention[]>();
    const newMentionCountByTracker = new Map<string, number>();

    for (const post of allPosts.values()) {
      for (const [kwLower, entries] of keywordToTrackers) {
        if (!keywordInPost(post, kwLower)) continue;

        for (const entry of entries) {
          const mention = postToMention(post, entry.trackerId, kwLower);

          if (!mentionsByUser.has(entry.uid)) {
            mentionsByUser.set(entry.uid, []);
          }
          mentionsByUser.get(entry.uid)!.push(mention);

          const key = `${entry.uid}:${entry.trackerId}`;
          newMentionCountByTracker.set(key, (newMentionCountByTracker.get(key) || 0) + 1);
        }
      }
    }

    // Batch-write mentions and update trackers, grouped by user
    let totalMentionsWritten = 0;
    let trackersUpdated = 0;

    for (const [uid, mentions] of mentionsByUser) {
      // Check which mentions already exist to avoid inflating counts
      const mentionRefs = mentions.map((m) =>
        db.doc(`users/${uid}/buzzMentions/${m.id}`),
      );

      // Firestore getAll supports up to 500 refs per call
      const existingDocs: FirebaseFirestore.DocumentSnapshot[] = [];
      for (let i = 0; i < mentionRefs.length; i += 500) {
        const chunk = mentionRefs.slice(i, i + 500);
        const snapshots = await db.getAll(...chunk);
        existingDocs.push(...snapshots);
      }
      const existingIds = new Set(
        existingDocs.filter((d) => d.exists).map((d) => d.id),
      );

      const newMentions = mentions.filter((m) => !existingIds.has(m.id));
      if (newMentions.length === 0) continue;

      // Write in batches of 500 (Firestore limit)
      for (let i = 0; i < newMentions.length; i += 400) {
        const chunk = newMentions.slice(i, i + 400);
        const batch = db.batch();
        for (const mention of chunk) {
          const ref = db.doc(`users/${uid}/buzzMentions/${mention.id}`);
          batch.set(ref, mention);
        }
        await batch.commit();
        totalMentionsWritten += chunk.length;
      }

      // Count new mentions per tracker for this user
      const newByTracker = new Map<string, number>();
      for (const m of newMentions) {
        newByTracker.set(m.trackerId, (newByTracker.get(m.trackerId) || 0) + 1);
      }

      // Update tracker metadata
      const trackerBatch = db.batch();
      for (const [trackerId, count] of newByTracker) {
        const ref = db.doc(`users/${uid}/buzzTrackers/${trackerId}`);
        trackerBatch.update(ref, {
          lastCheckedAt: new Date().toISOString(),
          totalMentions: FieldValue.increment(count),
          unseenCount: FieldValue.increment(count),
        });
        trackersUpdated++;
      }
      await trackerBatch.commit();
    }

    // Update lastCheckedAt for trackers that got zero new mentions
    const updatedKeys = new Set<string>();
    for (const [uid, mentions] of mentionsByUser) {
      const newMentionTrackers = new Set(mentions.map((m) => m.trackerId));
      for (const trackerId of newMentionTrackers) {
        updatedKeys.add(`${uid}:${trackerId}`);
      }
    }

    const noResultsBatch = db.batch();
    let noResultsCount = 0;
    for (const entry of trackerEntries) {
      const key = `${entry.uid}:${entry.trackerId}`;
      if (!updatedKeys.has(key)) {
        const ref = db.doc(`users/${entry.uid}/buzzTrackers/${entry.trackerId}`);
        noResultsBatch.update(ref, { lastCheckedAt: new Date().toISOString() });
        noResultsCount++;
      }
    }
    if (noResultsCount > 0) {
      await noResultsBatch.commit();
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(
      `[buzzCron] Done in ${elapsed}s. ` +
      `Posts: ${allPosts.size}, New mentions written: ${totalMentionsWritten}, ` +
      `Trackers updated: ${trackersUpdated + noResultsCount}` +
      (errors.length ? `, Errors: ${errors.length}` : ""),
    );
  },
);
