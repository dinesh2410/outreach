"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth, googleAuthProvider } from "./firebase-client";
import {
  deleteAuditEntry,
  deleteBuzzMentionsForTracker,
  deleteBuzzTrackerForUser,
  deleteCompetitorEntry,
  deleteHistoryEntry,
  deleteKeywordRankEntry,
  deleteMyApp,
  deleteRedditAnalysisEntry,
  deleteReviewIntelEntry,
  ensureUserDoc,
  fetchBuzzMentions,
  fetchMyApps,
  fetchUserApps,
  fetchUserAudits,
  fetchUserBuzzTrackers,
  fetchUserCompetitors,
  fetchUserHistory,
  fetchUserKeywordRanks,
  fetchUserQuotas,
  fetchUserRedditAnalyses,
  fetchUserReviewIntel,
  fetchUserSavedGenerations,
  incrementQuota,
  markBuzzMentionsSeen,
  recordAuditForUser,
  recordCompetitorForUser,
  recordGenerationHistory,
  recordKeywordRankForUser,
  recordRedditAnalysisForUser,
  recordReviewIntelForUser,
  saveAppForUser,
  saveBuzzMentionsBatch,
  saveBuzzTrackerForUser,
  saveGenerationForUser,
  saveMyAppForUser,
  updateBuzzTrackerAfterCheck,
  updateUserDoc,
  updateUserPlan,
  upsertGenerationOnApp,
} from "./firestore";
import {
  User,
  AppEntry,
  AuditRecord,
  BuzzMention,
  BuzzTracker,
  CompetitorRecord,
  EMPTY_QUOTAS,
  GenerationResult,
  KeywordRankRecord,
  MyApp,
  Platform,
  RedditAnalysisRecord,
  ReviewIntelligenceRecord,
  UserQuotas,
} from "./types";
import type { PlanId, QuotaTool } from "./plan-limits";
import {
  getEffectivePlan,
  getLimits,
  type PlanLimits,
} from "./plan-limits";

// Auth context — backed by Firebase Auth (Google + Email/Password) + Firestore.
// Apps and saved generations persist to Firestore so they survive refresh and sync across devices.

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  planId: PlanId;
}

interface AuthContextType {
  user: User | null;
  apps: AppEntry[];
  loading: boolean;
  plan: PlanId;
  planLimits: PlanLimits;
  quotas: UserQuotas;
  checkQuota: (tool: QuotaTool) => QuotaCheck;
  useQuota: (tool: QuotaTool) => Promise<UserQuotas>;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  addApp: (app: AppEntry) => void;
  addGeneration: (appId: string, gen: GenerationResult) => void;
  updateUser: (updates: Partial<User>) => void;
  savedGenerations: GenerationResult[];
  saveGeneration: (gen: GenerationResult) => void;
  history: GenerationResult[];
  recordHistory: (gen: GenerationResult) => void;
  removeHistory: (genId: string) => void;
  audits: AuditRecord[];
  recordAudit: (audit: AuditRecord) => void;
  removeAudit: (auditId: string) => void;
  competitors: CompetitorRecord[];
  recordCompetitor: (record: CompetitorRecord) => void;
  removeCompetitor: (competitorId: string) => void;
  keywordRanks: KeywordRankRecord[];
  recordKeywordRank: (record: KeywordRankRecord) => void;
  removeKeywordRank: (rankId: string) => void;
  redditAnalyses: RedditAnalysisRecord[];
  recordRedditAnalysis: (record: RedditAnalysisRecord) => void;
  removeRedditAnalysis: (analysisId: string) => void;
  myApps: MyApp[];
  saveMyApp: (app: MyApp) => void;
  removeMyApp: (appId: string) => void;
  reviewIntelligence: ReviewIntelligenceRecord[];
  recordReviewIntel: (record: ReviewIntelligenceRecord) => void;
  removeReviewIntel: (recordId: string) => void;
  buzzTrackers: BuzzTracker[];
  buzzMentions: BuzzMention[];
  saveBuzzTracker: (tracker: BuzzTracker) => void;
  removeBuzzTracker: (trackerId: string) => void;
  addBuzzMentions: (mentions: BuzzMention[], trackerId: string, newCount: number) => void;
  markMentionsSeen: (trackerId: string, mentionIds: string[]) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const GRADIENTS = [
  "linear-gradient(135deg, #B8331E, #D4972A)",
  "linear-gradient(135deg, #4A6D3D, #D4972A)",
  "linear-gradient(135deg, #8E2614, #B8331E)",
  "linear-gradient(135deg, #1A1714, #6E665B)",
  "linear-gradient(135deg, #D4972A, #B8331E)",
];

function splitName(displayName: string | null | undefined): { firstName: string; lastName: string } {
  if (!displayName) return { firstName: "", lastName: "" };
  const parts = displayName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

async function firebaseUserToAppUser(fbUser: FirebaseUser): Promise<User> {
  const split = splitName(fbUser.displayName);
  const stored = await ensureUserDoc(fbUser.uid, {
    email: fbUser.email ?? "",
    firstName: split.firstName,
    lastName: split.lastName,
  });
  return {
    id: fbUser.uid,
    email: stored.email,
    firstName: stored.firstName,
    lastName: stored.lastName,
    defaultPlatform: stored.defaultPlatform,
    emailNotifications: stored.emailNotifications,
    plan: stored.plan ?? "free",
    planExpiresAt: stored.planExpiresAt,
    trialEndsAt: stored.trialEndsAt,
    couponCode: stored.couponCode,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [savedGenerations, setSavedGenerations] = useState<GenerationResult[]>([]);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorRecord[]>([]);
  const [keywordRanks, setKeywordRanks] = useState<KeywordRankRecord[]>([]);
  const [redditAnalyses, setRedditAnalyses] = useState<RedditAnalysisRecord[]>([]);
  const [myApps, setMyApps] = useState<MyApp[]>([]);
  const [reviewIntelligence, setReviewIntelligence] = useState<ReviewIntelligenceRecord[]>([]);
  const [buzzTrackers, setBuzzTrackers] = useState<BuzzTracker[]>([]);
  const [buzzMentions, setBuzzMentions] = useState<BuzzMention[]>([]);
  const [quotas, setQuotas] = useState<UserQuotas>({ ...EMPTY_QUOTAS, periodStart: new Date().toISOString() });

  // Listen to auth state. On sign-in, hydrate apps + generations + history from Firestore.
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setApps([]);
        setSavedGenerations([]);
        setHistory([]);
        setAudits([]);
        setCompetitors([]);
        setKeywordRanks([]);
        setRedditAnalyses([]);
        setMyApps([]);
        setReviewIntelligence([]);
        setBuzzTrackers([]);
        setBuzzMentions([]);
        setQuotas({ ...EMPTY_QUOTAS, periodStart: new Date().toISOString() });
        setLoading(false);
        return;
      }
      try {
        const appUser = await firebaseUserToAppUser(fbUser);
        setUser(appUser);

        // Hydrate each collection independently — if one fails (e.g. firestore
        // rules not yet published for a newly-added subcollection), it must
        // not block the others. Each fetch falls back to its own empty list
        // and logs the underlying error.
        const safeFetch = async <T,>(
          label: string,
          fn: () => Promise<T[]>
        ): Promise<T[]> => {
          try {
            return await fn();
          } catch (err) {
            console.warn(`[auth] ${label} fetch failed:`, err);
            return [];
          }
        };

        const [
          userApps,
          userSaved,
          userHistory,
          userAudits,
          userCompetitors,
          userKeywordRanks,
          userRedditAnalyses,
          userMyApps,
          userReviewIntel,
          userBuzzTrackers,
          userBuzzMentions,
          userQuotas,
        ] = await Promise.all([
          safeFetch("apps", () => fetchUserApps(fbUser.uid)),
          safeFetch("savedGenerations", () => fetchUserSavedGenerations(fbUser.uid)),
          safeFetch("history", () => fetchUserHistory(fbUser.uid)),
          safeFetch("audits", () => fetchUserAudits(fbUser.uid)),
          safeFetch("competitors", () => fetchUserCompetitors(fbUser.uid)),
          safeFetch("keywordRanks", () => fetchUserKeywordRanks(fbUser.uid)),
          safeFetch("redditAnalyses", () => fetchUserRedditAnalyses(fbUser.uid)),
          safeFetch("myApps", () => fetchMyApps(fbUser.uid)),
          safeFetch("reviewIntelligence", () => fetchUserReviewIntel(fbUser.uid)),
          safeFetch("buzzTrackers", () => fetchUserBuzzTrackers(fbUser.uid)),
          safeFetch("buzzMentions", () => fetchBuzzMentions(fbUser.uid)),
          fetchUserQuotas(fbUser.uid).catch(() => ({ ...EMPTY_QUOTAS, periodStart: new Date().toISOString() })),
        ]);
        setApps(userApps);
        setSavedGenerations(userSaved);
        setHistory(userHistory);
        setAudits(userAudits);
        setCompetitors(userCompetitors);
        setKeywordRanks(userKeywordRanks);
        setRedditAnalyses(userRedditAnalyses);
        setMyApps(userMyApps);
        setReviewIntelligence(userReviewIntel);
        setBuzzTrackers(userBuzzTrackers);
        setBuzzMentions(userBuzzMentions);
        setQuotas(userQuotas);
      } catch (err) {
        console.error("[auth] failed to hydrate user data:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // onAuthStateChanged will hydrate state.
  }, []);

  const signUp = useCallback(
    async (firstName: string, lastName: string, email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Set Firebase displayName so future sign-ins surface the user's real name.
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}`.trim() });
      // Eagerly create the Firestore user doc with the supplied names (don't rely on splitName fallback).
      await ensureUserDoc(cred.user.uid, { email, firstName, lastName });
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(firebaseAuth, googleAuthProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
  }, []);

  const addApp = useCallback(
    (app: AppEntry) => {
      setApps((prev) => [...prev, app]);
      if (user) {
        saveAppForUser(user.id, app).catch((err) =>
          console.error("[auth] addApp persist failed:", err)
        );
      }
    },
    [user]
  );

  const addGeneration = useCallback(
    (appId: string, gen: GenerationResult) => {
      setApps((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, generations: [...app.generations, gen] } : app
        )
      );
      if (user) {
        upsertGenerationOnApp(user.id, appId, gen).catch((err) =>
          console.error("[auth] addGeneration persist failed:", err)
        );
      }
    },
    [user]
  );

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      setUser((prev) => (prev ? { ...prev, ...updates } : null));
      if (user) {
        updateUserDoc(user.id, updates).catch((err) =>
          console.error("[auth] updateUser persist failed:", err)
        );
      }
    },
    [user]
  );

  const saveGeneration = useCallback(
    (gen: GenerationResult) => {
      setSavedGenerations((prev) => {
        if (prev.some((g) => g.id === gen.id)) return prev;
        return [...prev, gen];
      });

      setApps((prev) => {
        const existing = prev.find((a) => a.name === gen.input.appName);
        if (existing) {
          if (existing.generations.some((g) => g.id === gen.id)) return prev;
          return prev.map((a) =>
            a.id === existing.id ? { ...a, generations: [...a.generations, gen] } : a
          );
        }
        const newApp: AppEntry = {
          id: `app-${Date.now()}`,
          name: gen.input.appName,
          category: gen.input.category,
          icon: GRADIENTS[prev.length % GRADIENTS.length],
          generations: [gen],
          createdAt: new Date().toISOString(),
        };
        if (user) {
          saveAppForUser(user.id, newApp).catch((err) =>
            console.error("[auth] saveGeneration createApp failed:", err)
          );
        }
        return [...prev, newApp];
      });

      if (user) {
        saveGenerationForUser(user.id, gen).catch((err) =>
          console.error("[auth] saveGeneration persist failed:", err)
        );
      }
    },
    [user]
  );

  const recordHistory = useCallback(
    (gen: GenerationResult) => {
      setHistory((prev) => {
        if (prev.some((g) => g.id === gen.id)) return prev;
        return [gen, ...prev];
      });
      if (user) {
        recordGenerationHistory(user.id, gen).catch((err) =>
          console.error("[auth] recordHistory persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeHistory = useCallback(
    (genId: string) => {
      setHistory((prev) => prev.filter((g) => g.id !== genId));
      if (user) {
        deleteHistoryEntry(user.id, genId).catch((err) =>
          console.error("[auth] removeHistory persist failed:", err)
        );
      }
    },
    [user]
  );

  const recordAudit = useCallback(
    (audit: AuditRecord) => {
      setAudits((prev) => {
        // Replace existing record with the same id (same URL re-audit),
        // then prepend so the latest sits at the top.
        const without = prev.filter((a) => a.id !== audit.id);
        return [audit, ...without];
      });
      if (user) {
        recordAuditForUser(user.id, audit).catch((err) =>
          console.error("[auth] recordAudit persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeAudit = useCallback(
    (auditId: string) => {
      setAudits((prev) => prev.filter((a) => a.id !== auditId));
      if (user) {
        deleteAuditEntry(user.id, auditId).catch((err) =>
          console.error("[auth] removeAudit persist failed:", err)
        );
      }
    },
    [user]
  );

  const recordCompetitor = useCallback(
    (record: CompetitorRecord) => {
      setCompetitors((prev) => {
        const without = prev.filter((c) => c.id !== record.id);
        return [record, ...without];
      });
      if (user) {
        recordCompetitorForUser(user.id, record).catch((err) =>
          console.error("[auth] recordCompetitor persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeCompetitor = useCallback(
    (competitorId: string) => {
      setCompetitors((prev) => prev.filter((c) => c.id !== competitorId));
      if (user) {
        deleteCompetitorEntry(user.id, competitorId).catch((err) =>
          console.error("[auth] removeCompetitor persist failed:", err)
        );
      }
    },
    [user]
  );

  const recordKeywordRank = useCallback(
    (record: KeywordRankRecord) => {
      setKeywordRanks((prev) => {
        const without = prev.filter((k) => k.id !== record.id);
        return [record, ...without];
      });
      if (user) {
        recordKeywordRankForUser(user.id, record).catch((err) =>
          console.error("[auth] recordKeywordRank persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeKeywordRank = useCallback(
    (rankId: string) => {
      setKeywordRanks((prev) => prev.filter((k) => k.id !== rankId));
      if (user) {
        deleteKeywordRankEntry(user.id, rankId).catch((err) =>
          console.error("[auth] removeKeywordRank persist failed:", err)
        );
      }
    },
    [user]
  );

  const recordRedditAnalysis = useCallback(
    (record: RedditAnalysisRecord) => {
      setRedditAnalyses((prev) => {
        const without = prev.filter((r) => r.id !== record.id);
        return [record, ...without];
      });
      if (user) {
        recordRedditAnalysisForUser(user.id, record).catch((err) =>
          console.error("[auth] recordRedditAnalysis persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeRedditAnalysis = useCallback(
    (analysisId: string) => {
      setRedditAnalyses((prev) => prev.filter((r) => r.id !== analysisId));
      if (user) {
        deleteRedditAnalysisEntry(user.id, analysisId).catch((err) =>
          console.error("[auth] removeRedditAnalysis persist failed:", err)
        );
      }
    },
    [user]
  );

  const saveMyApp = useCallback(
    (app: MyApp) => {
      setMyApps((prev) => {
        const without = prev.filter((a) => a.id !== app.id);
        return [app, ...without];
      });
      if (user) {
        saveMyAppForUser(user.id, app).catch((err) =>
          console.error("[auth] saveMyApp persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeMyApp = useCallback(
    (appId: string) => {
      setMyApps((prev) => prev.filter((a) => a.id !== appId));
      if (user) {
        deleteMyApp(user.id, appId).catch((err) =>
          console.error("[auth] removeMyApp persist failed:", err)
        );
      }
    },
    [user]
  );

  const recordReviewIntel = useCallback(
    (record: ReviewIntelligenceRecord) => {
      setReviewIntelligence((prev) => {
        const without = prev.filter((r) => r.id !== record.id);
        return [record, ...without];
      });
      if (user) {
        recordReviewIntelForUser(user.id, record).catch((err) =>
          console.error("[auth] recordReviewIntel persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeReviewIntel = useCallback(
    (recordId: string) => {
      setReviewIntelligence((prev) => prev.filter((r) => r.id !== recordId));
      if (user) {
        deleteReviewIntelEntry(user.id, recordId).catch((err) =>
          console.error("[auth] removeReviewIntel persist failed:", err)
        );
      }
    },
    [user]
  );

  const saveBuzzTracker = useCallback(
    (tracker: BuzzTracker) => {
      setBuzzTrackers((prev) => {
        const without = prev.filter((t) => t.id !== tracker.id);
        return [tracker, ...without];
      });
      if (user) {
        saveBuzzTrackerForUser(user.id, tracker).catch((err) =>
          console.error("[auth] saveBuzzTracker persist failed:", err)
        );
      }
    },
    [user]
  );

  const removeBuzzTracker = useCallback(
    (trackerId: string) => {
      setBuzzTrackers((prev) => prev.filter((t) => t.id !== trackerId));
      setBuzzMentions((prev) => prev.filter((m) => m.trackerId !== trackerId));
      if (user) {
        deleteBuzzTrackerForUser(user.id, trackerId).catch((err) =>
          console.error("[auth] removeBuzzTracker persist failed:", err)
        );
        deleteBuzzMentionsForTracker(user.id, trackerId).catch((err) =>
          console.error("[auth] removeBuzzMentions persist failed:", err)
        );
      }
    },
    [user]
  );

  const addBuzzMentions = useCallback(
    (mentions: BuzzMention[], trackerId: string, newCount: number) => {
      setBuzzMentions((prev) => [...mentions, ...prev]);
      setBuzzTrackers((prev) =>
        prev.map((t) =>
          t.id === trackerId
            ? {
                ...t,
                totalMentions: t.totalMentions + newCount,
                unseenCount: t.unseenCount + newCount,
                lastCheckedAt: new Date().toISOString(),
              }
            : t
        )
      );
      if (user) {
        saveBuzzMentionsBatch(user.id, mentions).catch((err) =>
          console.error("[auth] addBuzzMentions persist failed:", err)
        );
        updateBuzzTrackerAfterCheck(user.id, trackerId, {
          totalMentions: (buzzTrackers.find((t) => t.id === trackerId)?.totalMentions ?? 0) + newCount,
          unseenCount: (buzzTrackers.find((t) => t.id === trackerId)?.unseenCount ?? 0) + newCount,
          lastCheckedAt: new Date().toISOString(),
        }).catch((err) =>
          console.error("[auth] updateBuzzTracker persist failed:", err)
        );
      }
    },
    [user, buzzTrackers]
  );

  const markMentionsSeen = useCallback(
    (trackerId: string, mentionIds: string[]) => {
      setBuzzMentions((prev) =>
        prev.map((m) => (mentionIds.includes(m.id) ? { ...m, seen: true } : m))
      );
      setBuzzTrackers((prev) =>
        prev.map((t) =>
          t.id === trackerId
            ? { ...t, unseenCount: Math.max(0, t.unseenCount - mentionIds.length) }
            : t
        )
      );
      if (user) {
        markBuzzMentionsSeen(user.id, mentionIds).catch((err) =>
          console.error("[auth] markMentionsSeen persist failed:", err)
        );
        const tracker = buzzTrackers.find((t) => t.id === trackerId);
        if (tracker) {
          updateBuzzTrackerAfterCheck(user.id, trackerId, {
            unseenCount: Math.max(0, tracker.unseenCount - mentionIds.length),
          }).catch((err) =>
            console.error("[auth] updateBuzzTracker unseenCount persist failed:", err)
          );
        }
      }
    },
    [user, buzzTrackers]
  );

  const effectivePlan = user
    ? getEffectivePlan(user.plan, user.trialEndsAt, user.planExpiresAt)
    : "free" as PlanId;
  const planLimits = getLimits(effectivePlan);

  const checkQuota = useCallback(
    (tool: QuotaTool): QuotaCheck => {
      const limits = getLimits(effectivePlan);
      const limit = limits[tool];
      const used = quotas[tool] ?? 0;
      if (limit === 0) return { allowed: false, used, limit: 0, planId: effectivePlan };
      if (!isFinite(limit)) return { allowed: true, used, limit: Infinity, planId: effectivePlan };
      return { allowed: used < limit, used, limit, planId: effectivePlan };
    },
    [effectivePlan, quotas]
  );

  const useQuota = useCallback(
    async (tool: QuotaTool): Promise<UserQuotas> => {
      if (!user) return quotas;
      const updated = await incrementQuota(user.id, tool);
      setQuotas(updated);
      return updated;
    },
    [user, quotas]
  );

  const redeemCoupon = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: "Not signed in" };
      try {
        const res = await fetch("/api/redeem-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim().toUpperCase(), userId: user.id, userEmail: user.email }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, message: data.error ?? "Redemption failed" };
        setUser((prev) =>
          prev
            ? { ...prev, plan: data.plan, planExpiresAt: data.planExpiresAt, couponCode: code.trim().toUpperCase() }
            : null
        );
        if (user) {
          updateUserPlan(user.id, data.plan, data.planExpiresAt, code.trim().toUpperCase()).catch(
            (err) => console.error("[auth] updateUserPlan after coupon failed:", err)
          );
        }
        return { success: true, message: data.message ?? "Coupon redeemed!" };
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "Network error" };
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        apps,
        loading,
        plan: effectivePlan,
        planLimits,
        quotas,
        checkQuota,
        useQuota,
        redeemCoupon,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        addApp,
        addGeneration,
        updateUser,
        savedGenerations,
        saveGeneration,
        history,
        recordHistory,
        removeHistory,
        audits,
        recordAudit,
        removeAudit,
        competitors,
        recordCompetitor,
        removeCompetitor,
        keywordRanks,
        recordKeywordRank,
        removeKeywordRank,
        redditAnalyses,
        recordRedditAnalysis,
        removeRedditAnalysis,
        myApps,
        saveMyApp,
        removeMyApp,
        reviewIntelligence,
        recordReviewIntel,
        removeReviewIntel,
        buzzTrackers,
        buzzMentions,
        saveBuzzTracker,
        removeBuzzTracker,
        addBuzzMentions,
        markMentionsSeen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
