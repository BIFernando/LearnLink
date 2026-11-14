/**
 * Member 5 server helpers: notifications and the XP engine.
 * Shapes mirror app/types/member5.ts (the functions build can't import app files).
 */
import { getApps, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

import { levelFromXp, nextStreak, streakBonus } from "./xpRules";

export const REGION = "asia-south1";

export const COLLECTIONS = {
  users: "users",
  sessions: "sessions",
  exchangeRequests: "exchangeRequests",
  conversations: "conversations",
  messages: "messages",
  reviews: "reviews",
  notifications: "notifications",
  challenges: "challenges",
  challengeAnswers: "challengeAnswers",
  challengeAttempts: "challengeAttempts",
  badges: "badges",
  userBadges: "userBadges",
  xpTransactions: "xpTransactions",
  pushTokens: "pushTokens",
} as const;

export type NotificationType =
  | "NEW_MATCH"
  | "EXCHANGE_REQUEST"
  | "REQUEST_ACCEPTED"
  | "REQUEST_REJECTED"
  | "NEW_MESSAGE"
  | "SESSION_REMINDER"
  | "SESSION_COMPLETED"
  | "NEW_REVIEW"
  | "BADGE_EARNED"
  | "LEVEL_UP";

export type XpTransactionType = "EARN" | "BONUS" | "PENALTY";
export type XpReason =
  | "SESSION_COMPLETED"
  | "REVIEW_GIVEN"
  | "CHALLENGE_COMPLETED"
  | "BADGE_EARNED"
  | "STREAK_BONUS";

export function db(): Firestore {
  if (getApps().length === 0) initializeApp();
  return getFirestore();
}

export async function getDisplayName(userId: string): Promise<string> {
  const snapshot = await db().collection(COLLECTIONS.users).doc(userId).get();
  const name = snapshot.get("displayName");
  return typeof name === "string" && name.trim() ? name : "A LearnLink peer";
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ============================================
// Notifications
// ============================================

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId: string;
}

function notificationData(input: NotificationInput) {
  return {
    ...input,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/** Creates a notification. With `id`, overwrites that doc (used to collapse repeats). */
export async function createNotification(input: NotificationInput, id?: string): Promise<void> {
  const collection = db().collection(COLLECTIONS.notifications);
  const ref = id ? collection.doc(id) : collection.doc();
  await ref.set(notificationData(input));
}

/** Creates a notification only if `id` doesn't exist yet. Returns false if it did. */
export async function createNotificationOnce(input: NotificationInput, id: string): Promise<boolean> {
  try {
    await db().collection(COLLECTIONS.notifications).doc(id).create(notificationData(input));
    return true;
  } catch (error) {
    if (isAlreadyExists(error)) return false;
    throw error;
  }
}

export function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 6;
}

function queueNotification(transaction: Transaction, input: NotificationInput) {
  transaction.set(db().collection(COLLECTIONS.notifications).doc(), notificationData(input));
}

// ============================================
// XP engine
// ============================================

export interface AwardXpInput {
  userId: string;
  amount: number;
  type: XpTransactionType;
  reason: XpReason;
  referenceId: string;
  /** Deterministic id; a second award with the same id is ignored (idempotent triggers). */
  transactionId: string;
  /** Add the streak bonus as a separate STREAK_BONUS transaction. */
  withStreakBonus?: boolean;
  /** Activities that keep a streak alive. Badge awards don't. */
  countsForStreak?: boolean;
}

export interface AwardXpResult {
  awarded: boolean;
  totalAwarded: number;
  newXp: number;
  newLevel: number;
}

/**
 * Atomically: writes xpTransactions, updates users.{xp, level, streak},
 * and queues a LEVEL_UP notification. Safe to call twice with the same transactionId.
 */
export async function awardXp(input: AwardXpInput): Promise<AwardXpResult> {
  const firestore = db();
  const txRef = firestore.collection(COLLECTIONS.xpTransactions).doc(input.transactionId);
  const userRef = firestore.collection(COLLECTIONS.users).doc(input.userId);
  const lastActivityQuery = firestore
    .collection(COLLECTIONS.xpTransactions)
    .where("userId", "==", input.userId)
    .orderBy("createdAt", "desc")
    .limit(1);

  return firestore.runTransaction(async (transaction) => {
    const [existing, userSnap, lastActivity] = await Promise.all([
      transaction.get(txRef),
      transaction.get(userRef),
      transaction.get(lastActivityQuery),
    ]);

    const currentXp = numberOr(userSnap.get("xp"), 0);
    const currentLevel = numberOr(userSnap.get("level"), levelFromXp(currentXp));
    if (existing.exists || !userSnap.exists) {
      if (!userSnap.exists) logger.warn("awardXp: user not found", { userId: input.userId });
      return { awarded: false, totalAwarded: 0, newXp: currentXp, newLevel: currentLevel };
    }

    const now = new Date();
    const currentStreak = numberOr(userSnap.get("streak"), 0);
    const lastCreatedAt = lastActivity.docs[0]?.get("createdAt");
    const lastDate = lastCreatedAt instanceof Timestamp ? lastCreatedAt.toDate() : null;
    const countsForStreak = input.countsForStreak ?? true;
    const streak = countsForStreak ? nextStreak(lastDate, currentStreak, now) : currentStreak;
    const bonus = input.withStreakBonus ? streakBonus(streak) : 0;

    const totalAwarded = input.amount + bonus;
    const newXp = Math.max(0, currentXp + totalAwarded);
    const newLevel = levelFromXp(newXp);

    writeTransaction(transaction, txRef, input, input.amount);
    if (bonus > 0) {
      writeTransaction(
        transaction,
        firestore.collection(COLLECTIONS.xpTransactions).doc(`${input.transactionId}_streak`),
        { ...input, type: "BONUS", reason: "STREAK_BONUS" },
        bonus,
      );
    }

    transaction.update(userRef, { xp: newXp, level: newLevel, streak });

    if (newLevel > currentLevel) {
      queueNotification(transaction, {
        userId: input.userId,
        type: "LEVEL_UP",
        title: `Level ${newLevel} reached!`,
        body: `You levelled up with ${newXp.toLocaleString("en-US")} XP. Keep swapping skills to reach Level ${newLevel + 1}.`,
        referenceId: String(newLevel),
      });
    }

    return { awarded: true, totalAwarded, newXp, newLevel };
  });
}

function writeTransaction(
  transaction: Transaction,
  ref: DocumentReference,
  input: Pick<AwardXpInput, "userId" | "type" | "reason" | "referenceId">,
  amount: number,
) {
  transaction.set(ref, {
    userId: input.userId,
    amount,
    type: input.type,
    reason: input.reason,
    referenceId: input.referenceId,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
