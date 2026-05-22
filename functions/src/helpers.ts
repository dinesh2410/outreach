import type { RedditPost } from "./reddit";

export interface BuzzMention {
  id: string;
  trackerId: string;
  postId: string;
  title: string;
  body: string;
  author: string;
  subreddit: string;
  permalink: string;
  score: number;
  numComments: number;
  matchedKeyword: string;
  postCreatedAt: string;
  foundAt: string;
  seen: boolean;
}

export interface BuzzTracker {
  id: string;
  keywords: string[];
  subreddits?: string[];
  enabled: boolean;
  lastCheckedAt?: string;
  totalMentions: number;
  unseenCount: number;
  createdAt: string;
}

export function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function postToMention(
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

export function keywordInPost(post: RedditPost, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  return (
    post.title.toLowerCase().includes(kw) ||
    post.body.toLowerCase().includes(kw)
  );
}
