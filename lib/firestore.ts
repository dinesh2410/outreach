// Client-side Firestore helpers — runs in the browser via firebase-client.ts.
// Layout:
//   /users/{uid}                              user profile
//   /users/{uid}/apps/{appId}                 app entries (each contains its own generations array)
//   /users/{uid}/savedGenerations/{genId}     individually starred generations
//
// All reads/writes are scoped to the signed-in user's uid (enforced by Firestore security rules).

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "./firebase-client";
import {
  AppEntry,
  AuditRecord,
  BuzzMention,
  BuzzTracker,
  CompetitorRecord,
  CouponCode,
  CouponRedemption,
  EMPTY_QUOTAS,
  GenerationResult,
  KeywordRankRecord,
  MyApp,
  Platform,
  RedditAnalysisRecord,
  ReviewIntelligenceRecord,
  UsageRecord,
  User,
  UserQuotas,
} from "./types";
import type { PlanId, QuotaTool } from "./plan-limits";
import { TRIAL_DURATION_DAYS } from "./plan-limits";

interface UserDoc {
  email: string;
  firstName: string;
  lastName: string;
  defaultPlatform: Platform;
  emailNotifications: boolean;
  plan: PlanId;
  planExpiresAt?: string;
  trialEndsAt?: string;
  couponCode?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Firestore rejects writes that contain `undefined` anywhere in the tree.
// Our scraped snapshots are full of optional fields (subtitle, iconUrl,
// price, etc.) that may legitimately be missing. Recursively strip them
// before passing to setDoc so the write succeeds.
function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out as T;
}

const userRef = (uid: string) => doc(firestore, "users", uid);
const appsCol = (uid: string) => collection(firestore, "users", uid, "apps");
const appRef = (uid: string, appId: string) => doc(firestore, "users", uid, "apps", appId);
const savedGensCol = (uid: string) => collection(firestore, "users", uid, "savedGenerations");
const savedGenRef = (uid: string, genId: string) =>
  doc(firestore, "users", uid, "savedGenerations", genId);
const historyCol = (uid: string) => collection(firestore, "users", uid, "history");
const historyRef = (uid: string, genId: string) =>
  doc(firestore, "users", uid, "history", genId);
const auditsCol = (uid: string) => collection(firestore, "users", uid, "audits");
const auditRef = (uid: string, auditId: string) =>
  doc(firestore, "users", uid, "audits", auditId);
const competitorsCol = (uid: string) => collection(firestore, "users", uid, "competitors");
const competitorRef = (uid: string, competitorId: string) =>
  doc(firestore, "users", uid, "competitors", competitorId);
const keywordRanksCol = (uid: string) => collection(firestore, "users", uid, "keywordRanks");
const keywordRankRef = (uid: string, rankId: string) =>
  doc(firestore, "users", uid, "keywordRanks", rankId);
const redditCol = (uid: string) => collection(firestore, "users", uid, "redditAnalyses");
const redditRef = (uid: string, analysisId: string) =>
  doc(firestore, "users", uid, "redditAnalyses", analysisId);
const usageCol = (uid: string) => collection(firestore, "users", uid, "usage");
const usageRef = (uid: string, genId: string) =>
  doc(firestore, "users", uid, "usage", genId);
const myAppsCol = (uid: string) => collection(firestore, "users", uid, "myApps");
const myAppRef = (uid: string, appId: string) =>
  doc(firestore, "users", uid, "myApps", appId);
const reviewIntelCol = (uid: string) => collection(firestore, "users", uid, "reviewIntelligence");
const reviewIntelRef = (uid: string, recordId: string) =>
  doc(firestore, "users", uid, "reviewIntelligence", recordId);
const buzzTrackersCol = (uid: string) => collection(firestore, "users", uid, "buzzTrackers");
const buzzTrackerRef = (uid: string, trackerId: string) =>
  doc(firestore, "users", uid, "buzzTrackers", trackerId);
const buzzMentionsCol = (uid: string) => collection(firestore, "users", uid, "buzzMentions");
const buzzMentionRef = (uid: string, mentionId: string) =>
  doc(firestore, "users", uid, "buzzMentions", mentionId);

// Read the user doc; create with sensible defaults if it doesn't exist.
// Returns the resolved fields (not the raw Firestore doc).
export async function ensureUserDoc(
  uid: string,
  seed: { email: string; firstName: string; lastName: string }
): Promise<UserDoc> {
  const snap = await getDoc(userRef(uid));
  if (snap.exists()) {
    const d = snap.data() as Partial<UserDoc>;
    return {
      email: d.email ?? seed.email,
      firstName: d.firstName ?? seed.firstName,
      lastName: d.lastName ?? seed.lastName,
      defaultPlatform: (d.defaultPlatform as Platform) ?? "android",
      emailNotifications: d.emailNotifications ?? true,
      plan: (d.plan as PlanId) ?? "free",
      planExpiresAt: d.planExpiresAt,
      trialEndsAt: d.trialEndsAt,
      couponCode: d.couponCode,
    };
  }
  const trialEnd = new Date(
    Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fresh: Omit<UserDoc, "createdAt" | "updatedAt"> = {
    email: seed.email,
    firstName: seed.firstName,
    lastName: seed.lastName,
    defaultPlatform: "android",
    emailNotifications: true,
    plan: "trial",
    trialEndsAt: trialEnd,
  };
  await setDoc(userRef(uid), {
    ...fresh,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return fresh;
}

export async function updateUserDoc(uid: string, updates: Partial<User>): Promise<void> {
  // Strip the in-memory id (the doc id IS the uid; no need to store it).
  const { id: _id, ...rest } = updates;
  void _id;
  await updateDoc(userRef(uid), { ...rest, updatedAt: serverTimestamp() });
}

// --- apps -----------------------------------------------------------------

export async function fetchUserApps(uid: string): Promise<AppEntry[]> {
  const snap = await getDocs(appsCol(uid));
  return snap.docs.map((d) => d.data() as AppEntry);
}

export async function saveAppForUser(uid: string, app: AppEntry): Promise<void> {
  await setDoc(appRef(uid, app.id), app);
}

// Append a generation to an existing app's generations array. Read–modify–write because
// arrayUnion can't deduplicate complex objects by id reliably.
export async function upsertGenerationOnApp(
  uid: string,
  appId: string,
  gen: GenerationResult
): Promise<void> {
  const ref = appRef(uid, appId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data() as AppEntry;
  if (current.generations.some((g) => g.id === gen.id)) return;
  await updateDoc(ref, { generations: [...current.generations, gen] });
}

// --- saved generations ----------------------------------------------------

export async function fetchUserSavedGenerations(uid: string): Promise<GenerationResult[]> {
  const snap = await getDocs(savedGensCol(uid));
  return snap.docs.map((d) => d.data() as GenerationResult);
}

export async function saveGenerationForUser(
  uid: string,
  gen: GenerationResult
): Promise<void> {
  await setDoc(savedGenRef(uid, gen.id), gen);
}

// --- history (auto-recorded every generation) -----------------------------

export async function recordGenerationHistory(
  uid: string,
  gen: GenerationResult
): Promise<void> {
  await setDoc(historyRef(uid, gen.id), gen);
}

// Newest first. Firestore sorts by string comparison; createdAt is ISO so it sorts correctly.
export async function fetchUserHistory(uid: string): Promise<GenerationResult[]> {
  const snap = await getDocs(query(historyCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as GenerationResult);
}

export async function deleteHistoryEntry(uid: string, genId: string): Promise<void> {
  await deleteDoc(historyRef(uid, genId));
}

// --- audits (Score Checker history) ---------------------------------------

export async function recordAuditForUser(
  uid: string,
  audit: AuditRecord
): Promise<void> {
  await setDoc(auditRef(uid, audit.id), stripUndefined(audit));
}

export async function fetchUserAudits(uid: string): Promise<AuditRecord[]> {
  const snap = await getDocs(query(auditsCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as AuditRecord);
}

export async function deleteAuditEntry(uid: string, auditId: string): Promise<void> {
  await deleteDoc(auditRef(uid, auditId));
}

// --- competitor analyses (Competitor Watch history) ----------------------

export async function recordCompetitorForUser(
  uid: string,
  record: CompetitorRecord
): Promise<void> {
  await setDoc(competitorRef(uid, record.id), stripUndefined(record));
}

export async function fetchUserCompetitors(uid: string): Promise<CompetitorRecord[]> {
  const snap = await getDocs(query(competitorsCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as CompetitorRecord);
}

export async function deleteCompetitorEntry(uid: string, competitorId: string): Promise<void> {
  await deleteDoc(competitorRef(uid, competitorId));
}

// --- keyword rank history -------------------------------------------------

export async function recordKeywordRankForUser(
  uid: string,
  record: KeywordRankRecord
): Promise<void> {
  await setDoc(keywordRankRef(uid, record.id), stripUndefined(record));
}

export async function fetchUserKeywordRanks(uid: string): Promise<KeywordRankRecord[]> {
  const snap = await getDocs(query(keywordRanksCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as KeywordRankRecord);
}

export async function deleteKeywordRankEntry(uid: string, rankId: string): Promise<void> {
  await deleteDoc(keywordRankRef(uid, rankId));
}

// --- reddit demand analyses ----------------------------------------------

export async function recordRedditAnalysisForUser(
  uid: string,
  record: RedditAnalysisRecord
): Promise<void> {
  await setDoc(redditRef(uid, record.id), stripUndefined(record));
}

export async function fetchUserRedditAnalyses(uid: string): Promise<RedditAnalysisRecord[]> {
  const snap = await getDocs(query(redditCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as RedditAnalysisRecord);
}

export async function deleteRedditAnalysisEntry(uid: string, analysisId: string): Promise<void> {
  await deleteDoc(redditRef(uid, analysisId));
}

// --- usage records (admin monitoring) ------------------------------------
//
// One doc per /api/generate call, keyed by the generation id so re-running
// the same generation overwrites rather than duplicates. Stored under
// /users/{uid}/usage/{genId} so per-user reads stay scoped; the admin
// dashboard pulls across users via collectionGroup("usage").

export async function recordUsageForUser(
  uid: string,
  record: UsageRecord
): Promise<void> {
  await setDoc(usageRef(uid, record.id), stripUndefined(record));
}

export async function fetchUserUsage(uid: string): Promise<UsageRecord[]> {
  const snap = await getDocs(query(usageCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as UsageRecord);
}

// Admin-only: read every user's usage subcollection in one query. Requires
// a Firestore collectionGroup index on `usage`, ordered by createdAt desc.
// Firestore rules restrict this read to the admin email.
export async function fetchAllUsage(maxRecords = 500): Promise<UsageRecord[]> {
  const q = query(collectionGroup(firestore, "usage"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.slice(0, maxRecords).map((d) => d.data() as UsageRecord);
}

export async function fetchAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(firestore, "users"));
  return snap.docs.map((d) => {
    const raw = d.data() as UserDoc & Record<string, unknown>;
    return {
      id: d.id,
      firstName: raw.firstName ?? "",
      lastName: raw.lastName ?? "",
      email: raw.email ?? "",
      defaultPlatform: raw.defaultPlatform ?? "android",
      emailNotifications: raw.emailNotifications ?? false,
      plan: raw.plan ?? "free",
      planExpiresAt: raw.planExpiresAt,
      trialEndsAt: raw.trialEndsAt,
      couponCode: raw.couponCode,
      dodoSubscriptionId: raw.dodoSubscriptionId as string | undefined,
      dodoCustomerId: raw.dodoCustomerId as string | undefined,
      billingInterval: raw.billingInterval as "monthly" | "annual" | undefined,
      createdAt: raw.createdAt instanceof Timestamp ? raw.createdAt.toDate().toISOString() : undefined,
    } as User & { createdAt?: string };
  });
}

export async function fetchAllCoupons(): Promise<CouponCode[]> {
  const snap = await getDocs(query(collection(firestore, "coupons"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as CouponCode);
}

export async function fetchCouponRedemptions(): Promise<CouponRedemption[]> {
  const snap = await getDocs(query(collection(firestore, "couponRedemptions"), orderBy("redeemedAt", "desc")));
  return snap.docs.map((d) => d.data() as CouponRedemption);
}

// --- Your applications (MyApp reusable refs) -----------------------------

export async function saveMyAppForUser(uid: string, app: MyApp): Promise<void> {
  await setDoc(myAppRef(uid, app.id), stripUndefined(app));
}

export async function fetchMyApps(uid: string): Promise<MyApp[]> {
  const snap = await getDocs(query(myAppsCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as MyApp);
}

export async function deleteMyApp(uid: string, appId: string): Promise<void> {
  await deleteDoc(myAppRef(uid, appId));
}

// --- review intelligence (Review Intelligence history) -------------------

export async function recordReviewIntelForUser(
  uid: string,
  record: ReviewIntelligenceRecord
): Promise<void> {
  await setDoc(reviewIntelRef(uid, record.id), stripUndefined(record));
}

export async function fetchUserReviewIntel(uid: string): Promise<ReviewIntelligenceRecord[]> {
  const snap = await getDocs(query(reviewIntelCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as ReviewIntelligenceRecord);
}

export async function deleteReviewIntelEntry(uid: string, recordId: string): Promise<void> {
  await deleteDoc(reviewIntelRef(uid, recordId));
}

// --- quotas (monthly usage counters) -------------------------------------
//
// Stored at /users/{uid}/quotas/current. The `periodStart` field marks when
// the current billing period began (ISO). If more than ~30 days have passed,
// the counters are auto-reset on read.

const quotaRef = (uid: string) => doc(firestore, "users", uid, "quotas", "current");

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function shouldResetQuotas(periodStart: string): boolean {
  return new Date(periodStart).getMonth() !== new Date().getMonth() ||
    new Date(periodStart).getFullYear() !== new Date().getFullYear();
}

export async function fetchUserQuotas(uid: string): Promise<UserQuotas> {
  const snap = await getDoc(quotaRef(uid));
  if (!snap.exists()) {
    const fresh: UserQuotas = { ...EMPTY_QUOTAS, periodStart: currentPeriodStart() };
    await setDoc(quotaRef(uid), fresh);
    return fresh;
  }
  const data = snap.data() as UserQuotas;
  if (shouldResetQuotas(data.periodStart)) {
    const reset: UserQuotas = { ...EMPTY_QUOTAS, periodStart: currentPeriodStart() };
    await setDoc(quotaRef(uid), reset);
    return reset;
  }
  return data;
}

export async function incrementQuota(uid: string, tool: QuotaTool): Promise<UserQuotas> {
  const current = await fetchUserQuotas(uid);
  const updated: UserQuotas = { ...current, [tool]: (current[tool] ?? 0) + 1 };
  await setDoc(quotaRef(uid), updated);
  return updated;
}

// --- coupons (top-level collection, admin-managed) -----------------------
//
// Coupons live at /coupons/{code} so they're globally accessible. Redemption
// records live at /couponRedemptions/{id} for audit trails. The actual
// coupon validation + redemption logic runs server-side in the API route
// using the Admin SDK — these client-side helpers are just for reading
// the user's own plan status after redemption.

// --- buzz tracker (brand mention monitor) --------------------------------

export async function saveBuzzTrackerForUser(uid: string, tracker: BuzzTracker): Promise<void> {
  await setDoc(buzzTrackerRef(uid, tracker.id), stripUndefined(tracker));
}

export async function fetchUserBuzzTrackers(uid: string): Promise<BuzzTracker[]> {
  const snap = await getDocs(query(buzzTrackersCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as BuzzTracker);
}

export async function deleteBuzzTrackerForUser(uid: string, trackerId: string): Promise<void> {
  await deleteDoc(buzzTrackerRef(uid, trackerId));
}

export async function updateBuzzTrackerAfterCheck(
  uid: string,
  trackerId: string,
  patch: Partial<BuzzTracker>,
): Promise<void> {
  await updateDoc(buzzTrackerRef(uid, trackerId), stripUndefined(patch));
}

export async function saveBuzzMentionsBatch(uid: string, mentions: BuzzMention[]): Promise<void> {
  if (!mentions.length) return;
  const batch = writeBatch(firestore);
  for (const m of mentions) {
    batch.set(buzzMentionRef(uid, m.id), stripUndefined(m));
  }
  await batch.commit();
}

export async function fetchBuzzMentions(
  uid: string,
  trackerId?: string,
): Promise<BuzzMention[]> {
  const col = buzzMentionsCol(uid);
  const q = trackerId
    ? query(col, where("trackerId", "==", trackerId), orderBy("foundAt", "desc"))
    : query(col, orderBy("foundAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as BuzzMention);
}

export async function markBuzzMentionsSeen(uid: string, mentionIds: string[]): Promise<void> {
  if (!mentionIds.length) return;
  const batch = writeBatch(firestore);
  for (const id of mentionIds) {
    batch.update(buzzMentionRef(uid, id), { seen: true });
  }
  await batch.commit();
}

export async function deleteBuzzMentionsForTracker(uid: string, trackerId: string): Promise<void> {
  const snap = await getDocs(query(buzzMentionsCol(uid), where("trackerId", "==", trackerId)));
  if (snap.empty) return;
  const batch = writeBatch(firestore);
  for (const d of snap.docs) batch.delete(d.ref);
  await batch.commit();
}

// --- coupons (top-level collection, admin-managed) -----------------------

export async function updateUserPlan(
  uid: string,
  plan: PlanId,
  expiresAt?: string,
  couponCode?: string,
): Promise<void> {
  const updates: Record<string, unknown> = {
    plan,
    updatedAt: serverTimestamp(),
  };
  if (expiresAt) updates.planExpiresAt = expiresAt;
  if (couponCode) updates.couponCode = couponCode;
  await updateDoc(userRef(uid), updates);
}
