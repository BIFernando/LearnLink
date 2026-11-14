/**
 * Member 5: Chat, Notifications, Gamification.
 *
 * Collection and field names follow the team architecture doc. Fields marked
 * "SCHEMA ADDITION" are new and are listed in docs/member5-plan.md.
 *
 * Cloud Functions keep a mirror of the server-side shapes in
 * functions/src/member5/types.ts (the functions build cannot import app files).
 */
import type { Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | null;

// ============================================
// Collection names
// ============================================

export const MEMBER5_COLLECTIONS = {
  conversations: "conversations",
  messages: "messages", // subcollection: conversations/{conversationId}/messages
  reviews: "reviews",
  notifications: "notifications",
  challenges: "challenges",
  challengeAnswers: "challengeAnswers", // SCHEMA ADDITION: server-only
  challengeAttempts: "challengeAttempts",
  badges: "badges",
  userBadges: "userBadges",
  xpTransactions: "xpTransactions",
  pushTokens: "pushTokens", // SCHEMA ADDITION
} as const;

// ============================================
// Chat
// ============================================

export interface Conversation {
  conversationId: string;
  participantIds: string[];
  exchangeRequestId: string;
  lastMessage: string;
  lastMessageAt: FirestoreDate;
  createdAt: FirestoreDate;
  /** SCHEMA ADDITION: uid → unread message count. Maintained by Cloud Functions. */
  unreadCounts?: Record<string, number>;
}

export interface Message {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: FirestoreDate;
  isRead: boolean;
}

// ============================================
// Notifications
// ============================================

export const NOTIFICATION_TYPES = [
  "NEW_MATCH",
  "EXCHANGE_REQUEST",
  "REQUEST_ACCEPTED",
  "REQUEST_REJECTED",
  "NEW_MESSAGE",
  "SESSION_REMINDER",
  "SESSION_COMPLETED",
  "NEW_REVIEW",
  "BADGE_EARNED",
  "LEVEL_UP",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId: string;
  isRead: boolean;
  createdAt: FirestoreDate;
}

// ============================================
// Reviews
// ============================================

/** SCHEMA ADDITION: "What went well?" chips on Give Review / endorsements on View Reviews. */
export const REVIEW_TAGS = [
  "CLEAR_EXPLANATIONS",
  "PUNCTUAL_PREPARED",
  "PATIENT_TEACHER",
  "GREAT_EXAMPLES",
  "HELPFUL_RESOURCES",
  "FRIENDLY_ENCOURAGING",
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number];

export const REVIEW_TAG_LABELS: Record<ReviewTag, string> = {
  CLEAR_EXPLANATIONS: "Clear Explanations",
  PUNCTUAL_PREPARED: "Punctual & Prepared",
  PATIENT_TEACHER: "Patient Teacher",
  GREAT_EXAMPLES: "Great Code Examples",
  HELPFUL_RESOURCES: "Helpful Resources Shared",
  FRIENDLY_ENCOURAGING: "Friendly & Encouraging",
};

export const REVIEW_COMMENT_MAX_LENGTH = 500;

export interface Review {
  /** Deterministic id `${sessionId}_${reviewerId}` (one review per reviewer per session). */
  reviewId: string;
  sessionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1–5
  comment: string;
  tags: ReviewTag[]; // SCHEMA ADDITION
  createdAt: FirestoreDate;
}

export interface NewReviewInput {
  sessionId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  tags: ReviewTag[];
}

// ============================================
// Challenges
// ============================================

export type ChallengeDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface ChallengeQuestion {
  question: string;
  options: string[];
  /** SCHEMA ADDITION: shown in the per-question review after submitting. */
  explanation?: string;
}

/** Public challenge document. Correct answers live in challengeAnswers/{challengeId}. */
export interface Challenge {
  challengeId: string;
  title: string;
  description: string;
  category: string;
  difficulty: ChallengeDifficulty;
  questions: ChallengeQuestion[];
  xpReward: number;
  isActive: boolean;
  createdAt: FirestoreDate;
}

/** SCHEMA ADDITION: challengeAnswers/{challengeId}. Never readable by clients. */
export interface ChallengeAnswerKey {
  correctOptionIndexes: number[];
}

export interface ChallengeAttempt {
  attemptId: string;
  challengeId: string;
  userId: string;
  score: number; // 0–100
  xpEarned: number;
  completedAt: FirestoreDate;
}

export interface SubmitChallengeAttemptRequest {
  challengeId: string;
  answers: number[]; // selected option index per question, -1 = unanswered
}

export interface ChallengeQuestionResult {
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string | null;
}

export interface SubmitChallengeAttemptResponse {
  attemptId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  /** False when the user already earned XP for this challenge before. */
  isFirstAttempt: boolean;
  results: ChallengeQuestionResult[];
}

// ============================================
// Badges
// ============================================

/** SCHEMA ADDITION: badges.category drives the "Special" chip on the Badges screen. */
export type BadgeCategory = "SESSIONS" | "XP" | "REVIEWS" | "CHALLENGES" | "STREAK" | "SPECIAL";

export type BadgeRequirementType =
  | "XP_TOTAL"
  | "SESSIONS_COMPLETED"
  | "REVIEWS_GIVEN"
  | "CHALLENGES_COMPLETED"
  | "STREAK_DAYS";

/** Shape of badges.requirement (the doc lists the field but not its structure). */
export interface BadgeRequirement {
  type: BadgeRequirementType;
  threshold: number;
}

export interface Badge {
  badgeId: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  requirement: BadgeRequirement;
  xpReward: number; // SCHEMA ADDITION
  category: BadgeCategory; // SCHEMA ADDITION
}

export interface UserBadge {
  /** Deterministic id `${userId}_${badgeId}`. */
  userBadgeId: string;
  userId: string;
  badgeId: string;
  awardedAt: FirestoreDate;
}

// ============================================
// XP
// ============================================

export type XpTransactionType = "EARN" | "BONUS" | "PENALTY";

/** SCHEMA ADDITION: what the XP was for (Recent Activity labels on Progress/XP). */
export type XpReason =
  | "SESSION_COMPLETED"
  | "REVIEW_GIVEN"
  | "CHALLENGE_COMPLETED"
  | "BADGE_EARNED"
  | "STREAK_BONUS";

export interface XpTransaction {
  transactionId: string;
  userId: string;
  amount: number;
  type: XpTransactionType;
  referenceId: string;
  reason?: XpReason; // SCHEMA ADDITION
  createdAt: FirestoreDate;
}

// ============================================
// Users (owned by Member 1, read-only here)
// ============================================

/** Fields Member 5 reads from users/{userId}. xp/level/streak/rating* are server-managed. */
export interface GamifiedUser {
  userId: string;
  displayName?: string;
  profilePhotoUrl?: string;
  xp?: number;
  level?: number;
  streak?: number;
  ratingAverage?: number;
  ratingCount?: number;
}

// ============================================
// Push tokens
// ============================================

/** SCHEMA ADDITION: pushTokens/{userId}. Owner write only. */
export interface PushToken {
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
  updatedAt: FirestoreDate;
}
