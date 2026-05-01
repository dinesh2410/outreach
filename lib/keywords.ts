import { KeywordResult } from "./types";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "are", "was",
  "be", "has", "had", "have", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "not", "no", "nor", "so", "if",
  "then", "than", "too", "very", "just", "about", "above", "after", "again",
  "all", "also", "am", "as", "because", "been", "before", "being", "below",
  "between", "both", "during", "each", "few", "get", "got", "he", "her",
  "here", "him", "his", "how", "i", "into", "its", "let", "me", "more",
  "most", "my", "new", "now", "only", "other", "our", "out", "own", "re",
  "s", "same", "she", "some", "such", "t", "their", "them", "there",
  "these", "they", "through", "under", "up", "us", "we", "what", "when",
  "where", "which", "while", "who", "whom", "why", "you", "your",
  "don", "doesn", "didn", "won", "wouldn", "couldn", "shouldn",
]);

export function extractKeywords(text: string): KeywordResult[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
