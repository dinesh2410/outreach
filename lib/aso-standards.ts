// Unified ASO standards shared between the generator and scorer.
//
// When the generator creates content, it targets these thresholds.
// When the scorer evaluates a listing, it checks against the same values.
// This ensures generated content scores well, and that both tools reflect
// the same industry best practices (2025-2026 research from AppTweak,
// Sensor Tower, Phiture, SplitMetrics, MobileAction).

export const ASO = {
  TITLE_MAX: 30,

  SHORT_DESC_MIN: 60,
  SHORT_DESC_MAX: 80,

  FULL_DESC_FLOOR: 1500,
  FULL_DESC_CEILING: 3500,

  HOOK_FLOOR: 100,
  HOOK_CEILING: 400,

  SECTION_MIN: 4,
  SECTION_MAX: 10,

  EMOJI_MAX: 2,
  EXCLAMATION_MAX: 2,

  // 2.5% density ceiling per content term. Research: 2.5–3% optimal,
  // >4% triggers algorithmic penalty. We flag at 2.5% as a conservative
  // guardrail that both the generator targets and the scorer checks.
  KEYWORD_DENSITY_CEILING: 0.025,
  KEYWORD_STUFFING_MIN_COUNT: 8,

  BRAND_MENTIONS_MIN: 3,
  BRAND_MENTIONS_MAX: 8,

  BENEFIT_HITS_MIN: 3,

  RATING_FLOOR: 4.0,
  FRESHNESS_MONTHS: 6,
  SCREENSHOT_MIN: 4,
} as const;
