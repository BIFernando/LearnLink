import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/config/firebase";
import type { Session } from "@/types/member4/member4";
import {
  MEMBER5_COLLECTIONS,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_TAGS,
  type NewReviewInput,
  type Review,
  type ReviewTag,
} from "@/types/member5";

const REVIEWS_LIMIT = 50;

export const reviewIdFor = (sessionId: string, reviewerId: string) => `${sessionId}_${reviewerId}`;

export class ReviewNotAllowedError extends Error {}

/** Loads a session and checks the current user may review it. Returns the reviewee id. */
export async function getReviewableSession(
  sessionId: string,
  userId: string,
): Promise<{ session: Session; revieweeId: string }> {
  const snapshot = await getDoc(doc(db, "sessions", sessionId));
  if (!snapshot.exists()) throw new ReviewNotAllowedError("This session could not be found.");

  const session = { id: snapshot.id, ...snapshot.data() } as Session;
  if (session.teacherId !== userId && session.learnerId !== userId) {
    throw new ReviewNotAllowedError("You did not take part in this session.");
  }
  if (session.status !== "COMPLETED") {
    throw new ReviewNotAllowedError("You can review a session once it is completed.");
  }
  return {
    session,
    revieweeId: session.teacherId === userId ? session.learnerId : session.teacherId,
  };
}

export async function getMyReview(sessionId: string, reviewerId: string): Promise<Review | null> {
  const snapshot = await getDoc(doc(db, MEMBER5_COLLECTIONS.reviews, reviewIdFor(sessionId, reviewerId)));
  return snapshot.exists() ? ({ reviewId: snapshot.id, ...snapshot.data() } as Review) : null;
}

export function validateReview(input: NewReviewInput): string | null {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return "Choose a rating from 1 to 5 stars.";
  }
  if (input.comment.trim().length > REVIEW_COMMENT_MAX_LENGTH) {
    return `Keep your review under ${REVIEW_COMMENT_MAX_LENGTH} characters.`;
  }
  if (input.tags.some((tag) => !REVIEW_TAGS.includes(tag))) return "Unknown review tag.";
  return null;
}

/**
 * Creates reviews/{sessionId}_{reviewerId}. Rules reject a second review for the same
 * session (it would be an update). Rating stats, XP and the NEW_REVIEW notification are
 * handled by the onReviewCreated Cloud Function.
 */
export async function submitReview(input: NewReviewInput, reviewerId: string): Promise<void> {
  const problem = validateReview(input);
  if (problem) throw new ReviewNotAllowedError(problem);

  if (await getMyReview(input.sessionId, reviewerId)) {
    throw new ReviewNotAllowedError("You have already reviewed this session.");
  }

  await setDoc(doc(db, MEMBER5_COLLECTIONS.reviews, reviewIdFor(input.sessionId, reviewerId)), {
    sessionId: input.sessionId,
    reviewerId,
    revieweeId: input.revieweeId,
    rating: input.rating,
    comment: input.comment.trim(),
    tags: input.tags,
    createdAt: serverTimestamp(),
  });
}

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  const snapshot = await getDocs(
    query(
      collection(db, MEMBER5_COLLECTIONS.reviews),
      where("revieweeId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(REVIEWS_LIMIT),
    ),
  );
  return snapshot.docs.map((reviewDoc) => ({ reviewId: reviewDoc.id, ...reviewDoc.data() }) as Review);
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** index 0 = 1 star … index 4 = 5 stars */
  distribution: [number, number, number, number, number];
  topTags: { tag: ReviewTag; count: number }[];
}

export function summarizeReviews(reviews: Review[]): ReviewSummary {
  const distribution: ReviewSummary["distribution"] = [0, 0, 0, 0, 0];
  const tagCounts = new Map<ReviewTag, number>();
  let total = 0;

  reviews.forEach((review) => {
    const stars = Math.min(5, Math.max(1, Math.round(review.rating)));
    distribution[stars - 1] += 1;
    total += review.rating;
    (review.tags ?? []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1));
  });

  return {
    average: reviews.length ? total / reviews.length : 0,
    count: reviews.length,
    distribution,
    topTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair Session",
  3: "Good Session",
  4: "Great Mentor!",
  5: "Exceptional Mentor!",
};
