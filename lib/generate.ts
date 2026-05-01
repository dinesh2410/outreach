// This function will be replaced by a real Gemini 2.5 Flash API call.
// Keep the signature stable so the swap is a one-file change.

import { GeneratorInput, GenerationResult, Variant, Platform } from "./types";
import { CATEGORY_THEMES } from "./constants";

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1).trim() + "\u2026";
}

function pickKeywords(category: string, n: number): string[] {
  const theme = CATEGORY_THEMES[category as keyof typeof CATEGORY_THEMES] || CATEGORY_THEMES.Other;
  const shuffled = [...theme.keywords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function buildFeatureList(features: string): string[] {
  return features
    .split(/[,\n]+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

function toneAdjust(
  text: string,
  tone: GeneratorInput["tone"]
): string {
  switch (tone) {
    case "playful":
      return text.replace(/\. /g, "! ").replace(/efficiently/g, "like magic");
    case "minimal":
      return text
        .split(". ")
        .slice(0, Math.ceil(text.split(". ").length * 0.6))
        .join(". ") + ".";
    case "casual":
      return text.replace(/utilize/g, "use").replace(/Therefore/g, "So");
    default:
      return text;
  }
}

function generateKeywordVariant(
  input: GeneratorInput,
  platform: Platform
): Variant {
  const theme = CATEGORY_THEMES[input.category] || CATEGORY_THEMES.Other;
  const keywords = pickKeywords(input.category, 4);
  const featureList = buildFeatureList(input.features);
  const audience = input.audience || theme.users;

  const title = truncate(
    `${input.appName} - ${keywords[0]} ${keywords[1]}`.replace(/^\w/, (c) =>
      c.toUpperCase()
    ),
    30
  );

  const shortDesc =
    platform === "android"
      ? truncate(
          `${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} ${input.category.toLowerCase()} app for ${audience}`,
          80
        )
      : undefined;

  const subtitle =
    platform === "ios"
      ? truncate(`${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} for ${audience}`, 30)
      : undefined;

  const bulletPoints = featureList
    .map(
      (f, i) =>
        `\u2022 ${f}${i < keywords.length ? ` \u2014 powered by ${keywords[i] || keywords[0]}` : ""}`
    )
    .join("\n");

  const fullDesc = toneAdjust(
    `${input.appName} is the ${keywords[0]} ${input.category.toLowerCase()} app built for ${audience}.\n\n` +
      `Key Features:\n${bulletPoints}\n\n` +
      `Why ${input.appName}?\n` +
      `Built from the ground up with ${keywords.join(", ")} at its core. ` +
      `Whether you're looking to ${keywords[1]} or ${keywords[2]}, ${input.appName} delivers a seamless experience.\n\n` +
      `Designed for ${audience} who demand a ${keywords[3] || "powerful"} approach to ${input.category.toLowerCase()}.\n\n` +
      `Download ${input.appName} today and experience the difference that thoughtful ${keywords[0]} design makes.`,
    input.tone
  );

  return {
    id: `kw-${platform}-${Date.now()}`,
    label: "Keyword-Optimized",
    approach: "keyword",
    title,
    shortDesc,
    subtitle,
    fullDesc: truncate(fullDesc, 4000),
  };
}

function generateConversionVariant(
  input: GeneratorInput,
  platform: Platform
): Variant {
  const theme = CATEGORY_THEMES[input.category] || CATEGORY_THEMES.Other;
  const hook = theme.hook.replace("{appName}", input.appName);
  const featureList = buildFeatureList(input.features);
  const audience = input.audience || theme.users;
  const keywords = pickKeywords(input.category, 3);

  const title = truncate(`${input.appName}: ${keywords[0]} done right`, 30);

  const shortDesc =
    platform === "android"
      ? truncate(`${hook.split(".")[0]}.`, 80)
      : undefined;

  const subtitle =
    platform === "ios"
      ? truncate(`${keywords[0]} done right`, 30)
      : undefined;

  const featureSection = featureList
    .map((f) => `\u2713 ${f}`)
    .join("\n");

  const fullDesc = toneAdjust(
    `${hook}\n\n` +
      `Here's the thing \u2014 ${audience} deserve better tools. ` +
      `${input.appName} was built because the existing options weren't cutting it.\n\n` +
      `What you get:\n${featureSection}\n\n` +
      `No bloat. No dark patterns. No subscription traps.\n\n` +
      `${input.appName} is built for ${audience} who want results, not gimmicks. ` +
      `Every feature exists because someone asked for it. Nothing is there to pad a feature list.\n\n` +
      `Try it. If it doesn't click in the first 60 seconds, it's probably not for you. ` +
      `But for the ${audience} who get it \u2014 it becomes indispensable.`,
    input.tone
  );

  return {
    id: `cv-${platform}-${Date.now()}`,
    label: "Conversion-Focused",
    approach: "conversion",
    title,
    shortDesc,
    subtitle,
    fullDesc: truncate(fullDesc, 4000),
  };
}

function generateBrandVariant(
  input: GeneratorInput,
  platform: Platform
): Variant {
  const theme = CATEGORY_THEMES[input.category] || CATEGORY_THEMES.Other;
  const featureList = buildFeatureList(input.features);
  const primaryFeature = featureList[0] || input.category.toLowerCase();

  const title = truncate(`${input.appName}`, 30);

  const shortDesc =
    platform === "android"
      ? truncate(`${primaryFeature}. Thoughtfully.`, 80)
      : undefined;

  const subtitle =
    platform === "ios"
      ? truncate(`${primaryFeature}. Simply.`, 30)
      : undefined;

  const fullDesc = toneAdjust(
    `${input.appName}.\n\n` +
      `${primaryFeature.charAt(0).toUpperCase() + primaryFeature.slice(1)}. Done differently.\n\n` +
      `Not another ${input.category.toLowerCase()} app. Not another dashboard. ` +
      `Something quieter. Something that works the way you think.\n\n` +
      featureList
        .slice(0, 3)
        .map((f) => `${f}.`)
        .join("\n") +
      `\n\nThat's it. No feature list longer than a receipt. ` +
      `No promises we can't keep.\n\n` +
      `Built for ${theme.users} who'd rather do the thing than read about the thing.\n\n` +
      `${input.appName}. ${primaryFeature}. That's the whole pitch.`,
    input.tone
  );

  return {
    id: `br-${platform}-${Date.now()}`,
    label: "Brand-Led",
    approach: "brand",
    title,
    shortDesc,
    subtitle,
    fullDesc: truncate(fullDesc, 4000),
  };
}

export function generateVariants(input: GeneratorInput): GenerationResult {
  const result: GenerationResult = {
    id: `gen-${Date.now()}`,
    input,
    createdAt: new Date().toISOString(),
  };

  for (const platform of input.platform) {
    const variants: Variant[] = [
      generateKeywordVariant(input, platform),
      generateConversionVariant(input, platform),
      generateBrandVariant(input, platform),
    ];

    if (platform === "android") {
      result.android = variants;
    } else {
      result.ios = variants;
    }
  }

  return result;
}

export default generateVariants;
