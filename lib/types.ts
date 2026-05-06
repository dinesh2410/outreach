export type Platform = "android" | "ios";

export type Category =
  | "Productivity"
  | "AI / ML"
  | "Dev tools"
  | "Game"
  | "Social"
  | "Lifestyle"
  | "Finance"
  | "Health & fitness"
  | "Other";

export interface GeneratorInput {
  platform: Platform[];
  appName: string;
  category: Category;
  features: string;
  audience?: string;
  tone: "professional" | "casual" | "playful" | "minimal";
  storeUrl?: string;
  clarifications?: ClarifyingAnswer[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  why: string;
}

export interface ClarifyingAnswer {
  id: string;
  question: string;
  answer: string;
}

export interface Variant {
  id: string;
  label: string;
  approach: "keyword" | "conversion" | "brand";
  title: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc: string;
  keywords?: string[];
}

export interface GenerationResult {
  id: string;
  input: GeneratorInput;
  android?: Variant[];
  ios?: Variant[];
  createdAt: string;
}

export interface AppEntry {
  id: string;
  name: string;
  category: Category;
  icon: string;
  generations: GenerationResult[];
  createdAt: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  defaultPlatform: Platform;
  emailNotifications: boolean;
}

export interface ScoreResult {
  score: number;
  grade: string;
  checks: ScoreCheck[];
}

export interface ScoreCheck {
  label: string;
  passed: boolean;
  note: string;
}

export interface KeywordResult {
  word: string;
  count: number;
}

export interface Toast {
  id: string;
  message: string;
  type: "default" | "success";
}
