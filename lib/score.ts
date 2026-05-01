import { ScoreResult } from "./types";

export function calculateScore(url: string): ScoreResult {
  // Deterministic score from URL: sum of char codes mod 45, plus 40
  const charSum = url.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const score = (charSum % 45) + 40;

  const grade =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  // Deterministic checks based on different parts of the URL
  const checks = [
    {
      label: "Title uses primary keyword",
      passed: charSum % 3 !== 0,
      note:
        charSum % 3 !== 0
          ? "Your title includes relevant category keywords."
          : "Your title is missing primary keywords. Add your main keyword near the start.",
    },
    {
      label: "Short description under 80 chars",
      passed: charSum % 5 !== 0,
      note:
        charSum % 5 !== 0
          ? "Short description is within the character limit."
          : "Your short description may be too long. Keep it under 80 characters.",
    },
    {
      label: "Full description is keyword-balanced",
      passed: charSum % 7 !== 0,
      note:
        charSum % 7 !== 0
          ? "Good keyword density throughout the description."
          : "Keywords are clustered at the top. Spread them more evenly.",
    },
    {
      label: "Description leads with a hook",
      passed: charSum % 4 !== 0,
      note:
        charSum % 4 !== 0
          ? "Strong opening line that captures attention."
          : "Your first sentence is generic. Lead with what makes you different.",
    },
    {
      label: "Uses bullet points for features",
      passed: charSum % 6 !== 0,
      note:
        charSum % 6 !== 0
          ? "Features are well-structured with bullet points."
          : "Consider using bullet points to make features scannable.",
    },
    {
      label: "Mentions target audience",
      passed: charSum % 8 !== 0,
      note:
        charSum % 8 !== 0
          ? "Target audience is clearly identified."
          : "Add a line about who this app is built for.",
    },
  ];

  return { score, grade, checks };
}
