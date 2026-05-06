import type { GeneratorInput } from "@/lib/types";

export function buildClarifyPrompt(input: GeneratorInput): string {
  return `You are an ASO (App Store Optimization) expert about to write a store listing for an indie developer's app.

Before writing, you ask EXACTLY THREE questions. The three answers together must paint a complete, specific picture of THIS app — not a generic productivity/fitness/whatever app, but this exact one. Every ASO listing is unique, so your questions must be unique too.

Developer's input so far:
- App name: ${input.appName}
- Category: ${input.category}
- Key features: ${input.features}
${input.audience ? `- Target audience: ${input.audience}` : "- Target audience: (not provided)"}
- Tone: ${input.tone}
${input.storeUrl ? `- Existing store URL: ${input.storeUrl}` : ""}

CRITICAL: Your questions must reference the developer's specific input. They should sound like a smart human asking after reading the input — not a template. The developer should read each question and think "they actually understood what I wrote."

BAD examples (generic, template-shaped — never ask these):
- "Who is your target audience?"
- "What is your unique selling point?"
- "What problem does your app solve?"
- "What is your monetization model?"
- "What makes you different from competitors?"

GOOD examples (specific to the app described):
- For a Pomodoro app with "distraction blocker": "When the distraction blocker engages, what exactly happens — does it hard-block apps, gray them out, or just nudge the user? The wording in the listing depends on this."
- For a recipe app with "AI suggestions": "What does the AI actually use to suggest a recipe — pantry photos, typed ingredients, dietary preferences, time of day? I need to describe the trigger concretely."
- For a meditation app with "for new parents": "What's the longest session a sleep-deprived parent could realistically do — under 5 minutes? Knowing the upper bound changes how we pitch the time commitment."

Question rules:
- Pick three different angles. Aim to cover: (a) the concrete user moment / behavior, (b) the differentiator that's specific to this app's mechanic, (c) the constraint or context the user is in when they open it. Adapt the angles based on what's already provided — don't ask about something the developer already specified.
- Each question must be answerable in 1-3 sentences of free text. The user types — there are no multiple-choice options.
- Be as concise as the question allows. Short when a short question is sharper; longer only when extra context is genuinely needed.
- Each question references something concrete from the developer's input (a feature, the category, the audience phrase, the app name).
- 'why' is one sentence: which specific part of the listing copy changes based on the answer.

Return ONLY the structured object. Three questions, no commentary.`;
}
