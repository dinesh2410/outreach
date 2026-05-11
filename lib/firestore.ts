// Client-side Firestore helpers — runs in the browser via firebase-client.ts.
// Layout:
//   /users/{uid}                              user profile
//   /users/{uid}/apps/{appId}                 app entries (each contains its own generations array)
//   /users/{uid}/savedGenerations/{genId}     individually starred generations
//
// All reads/writes are scoped to the signed-in user's uid (enforced by Firestore security rules).

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "./firebase-client";
import { AppEntry, AuditRecord, GenerationResult, Platform, User } from "./types";

interface UserDoc {
  email: string;
  firstName: string;
  lastName: string;
  defaultPlatform: Platform;
  emailNotifications: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
    };
  }
  const fresh: Omit<UserDoc, "createdAt" | "updatedAt"> = {
    email: seed.email,
    firstName: seed.firstName,
    lastName: seed.lastName,
    defaultPlatform: "android",
    emailNotifications: true,
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
  await setDoc(auditRef(uid, audit.id), audit);
}

export async function fetchUserAudits(uid: string): Promise<AuditRecord[]> {
  const snap = await getDocs(query(auditsCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as AuditRecord);
}

export async function deleteAuditEntry(uid: string, auditId: string): Promise<void> {
  await deleteDoc(auditRef(uid, auditId));
}
