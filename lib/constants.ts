import { Category } from "./types";

export const CATEGORY_LIST: { value: Category; label: string; icon: string }[] = [
  { value: "Productivity", label: "Productivity", icon: "Zap" },
  { value: "AI / ML", label: "AI / ML", icon: "Brain" },
  { value: "Dev tools", label: "Dev tools", icon: "Code" },
  { value: "Game", label: "Game", icon: "Gamepad2" },
  { value: "Social", label: "Social", icon: "Users" },
  { value: "Lifestyle", label: "Lifestyle", icon: "Heart" },
  { value: "Finance", label: "Finance", icon: "Wallet" },
  { value: "Health & fitness", label: "Health & fitness", icon: "Activity" },
  { value: "Other", label: "Other", icon: "Grid3X3" },
];

export const CATEGORY_THEMES: Record<
  Category,
  {
    keywords: string[];
    users: string;
    hook: string;
    exampleFeatures: string;
    exampleAudience: string;
  }
> = {
  Productivity: {
    keywords: ["productivity", "focus", "organize", "tasks", "workflow", "efficient", "streamline"],
    users: "professionals and creators",
    hook: "Most productivity apps slow you down. {appName} doesn't.",
    exampleFeatures:
      "Smart task organization, focus timer with analytics, daily planning assistant, cross-device sync",
    exampleAudience: "Remote workers and freelancers who juggle multiple projects",
  },
  "AI / ML": {
    keywords: ["AI", "intelligent", "automation", "smart", "generate", "learn", "predict"],
    users: "modern teams",
    hook: "Most AI apps are gimmicks. {appName} earns its keep.",
    exampleFeatures:
      "AI-powered text generation, smart image editing, automated workflows, natural language commands",
    exampleAudience: "Content creators and small teams looking to automate repetitive work",
  },
  "Dev tools": {
    keywords: ["developer", "build", "code", "workflow", "ship", "debug", "deploy"],
    users: "developers",
    hook: "Most dev tools fight you. {appName} gets out of your way.",
    exampleFeatures:
      "Code snippets manager, API testing, Git workflow shortcuts, local dev environment setup",
    exampleAudience: "Solo developers and small engineering teams",
  },
  Game: {
    keywords: ["play", "game", "puzzle", "fun", "challenge", "score", "level"],
    users: "players",
    hook: "Most games waste your time. {appName} respects it.",
    exampleFeatures: "Unique puzzle mechanics, daily challenges, offline play, minimalist design",
    exampleAudience: "Casual gamers who want a quick mental break",
  },
  Social: {
    keywords: ["connect", "social", "share", "community", "friends", "chat", "network"],
    users: "people who love staying connected",
    hook: "Most social apps want your attention. {appName} earns it.",
    exampleFeatures:
      "Interest-based groups, private messaging, event planning, content sharing",
    exampleAudience: "Young professionals looking for meaningful community connections",
  },
  Lifestyle: {
    keywords: ["lifestyle", "daily", "habit", "routine", "personal", "wellness", "mindful"],
    users: "anyone building better habits",
    hook: "Most apps want you to log in every day. {appName} doesn't need to.",
    exampleFeatures: "Habit tracking, daily journaling, mood logging, personalized insights",
    exampleAudience: "People looking to build sustainable daily routines",
  },
  Finance: {
    keywords: ["money", "budget", "track", "save", "spend", "invest", "finance"],
    users: "smart spenders",
    hook: "Most money apps want to sell you something. {appName} won't.",
    exampleFeatures: "Expense tracking, budget categories, savings goals, spending insights",
    exampleAudience: "Young adults managing their finances for the first time",
  },
  "Health & fitness": {
    keywords: ["health", "fitness", "wellness", "track", "workout", "exercise", "nutrition"],
    users: "active people",
    hook: "Most fitness apps shame you. {appName} just helps.",
    exampleFeatures:
      "Workout tracking, custom routines, progress photos, nutrition logging",
    exampleAudience: "Beginners who want a no-judgment fitness companion",
  },
  Other: {
    keywords: ["app", "use", "experience", "tool", "utility", "simple"],
    users: "users",
    hook: "Most apps in this space miss the point. {appName} doesn't.",
    exampleFeatures:
      "Core utility features, clean interface, fast performance, offline support",
    exampleAudience: "Anyone looking for a better way to handle this task",
  },
};
