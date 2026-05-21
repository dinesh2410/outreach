import { NextRequest, NextResponse } from "next/server";
import {
  searchRedditMany,
  fetchAndMatchKeywords,
  keywordInPost,
  type RedditPost,
  type RedditSearchOptions,
} from "@/lib/reddit";
import type { BuzzMention, BuzzCheckResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function postToMention(
  post: RedditPost,
  trackerId: string,
  matchedKeyword: string,
): BuzzMention {
  return {
    id: `bm_${djb2(trackerId + post.id)}`,
    trackerId,
    postId: post.id,
    title: post.title,
    body: post.body.slice(0, 2000),
    author: post.author,
    subreddit: post.subreddit,
    permalink: post.permalink,
    score: post.score,
    numComments: post.numComments,
    matchedKeyword,
    postCreatedAt: post.createdAt,
    foundAt: new Date().toISOString(),
    seen: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { trackerId, keywords, subreddits } = await req.json();
    if (!trackerId || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "trackerId and keywords[] required" },
        { status: 400 },
      );
    }

    const errors: string[] = [];

    // 1. Search Reddit for each keyword
    const searchQueries: RedditSearchOptions[] = keywords.map((kw: string) => ({
      query: kw,
      sort: "new" as const,
      t: "day" as const,
      limit: 25,
    }));

    let searchPosts: RedditPost[] = [];
    try {
      searchPosts = await searchRedditMany(searchQueries);
    } catch (err) {
      errors.push(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. Fetch subreddit feeds if specified
    let feedPosts: RedditPost[] = [];
    if (Array.isArray(subreddits) && subreddits.length > 0) {
      try {
        feedPosts = await fetchAndMatchKeywords(subreddits, keywords, 100);
      } catch (err) {
        errors.push(`Feed fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Combine + dedup, match keywords
    const allPosts = new Map<string, { post: RedditPost; keyword: string }>();
    for (const post of searchPosts) {
      if (allPosts.has(post.id)) continue;
      const matchedKw = keywords.find((kw: string) => keywordInPost(post, kw));
      if (matchedKw) {
        allPosts.set(post.id, { post, keyword: matchedKw });
      }
    }
    for (const post of feedPosts) {
      if (allPosts.has(post.id)) continue;
      const matchedKw = keywords.find((kw: string) => keywordInPost(post, kw));
      if (matchedKw) {
        allPosts.set(post.id, { post, keyword: matchedKw });
      }
    }

    // 4. Convert to mentions
    const mentions: BuzzMention[] = Array.from(allPosts.values()).map(({ post, keyword }) =>
      postToMention(post, trackerId, keyword),
    );

    const result: BuzzCheckResult & { mentions: BuzzMention[] } = {
      trackerId,
      newMentionCount: mentions.length,
      totalChecked: allPosts.size,
      checkedAt: new Date().toISOString(),
      errors: errors.length ? errors : undefined,
      mentions,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[buzz/check] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Check failed" },
      { status: 500 },
    );
  }
}
