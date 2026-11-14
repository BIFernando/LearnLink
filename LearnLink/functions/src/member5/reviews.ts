import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { checkBadges } from "./badges";
import { COLLECTIONS, REGION, awardXp, createNotification, db, getDisplayName, numberOr } from "./shared";
import { XP_PER_REVIEW } from "./xpRules";

/**
 * New review → reviewee's ratingAverage/ratingCount, NEW_REVIEW notification,
 * and +XP_PER_REVIEW for the reviewer (once per session per reviewer).
 */
export const onReviewCreated = onDocumentCreated(
  { document: "reviews/{reviewId}", region: REGION },
  async (event) => {
    const review = event.data?.data();
    if (!review) return;
    const { reviewId } = event.params;
    const reviewerId = review.reviewerId as string;
    const revieweeId = review.revieweeId as string;
    const sessionId = review.sessionId as string;
    const rating = numberOr(review.rating, 0);
    if (rating < 1 || rating > 5) return;

    const firestore = db();
    const revieweeRef = firestore.collection(COLLECTIONS.users).doc(revieweeId);
    const reviewRef = firestore.collection(COLLECTIONS.reviews).doc(reviewId);

    // `ratingCounted` (server-only) stops a retried trigger from counting the review twice.
    const counted = await firestore.runTransaction(async (transaction) => {
      const [userSnap, reviewSnap] = await Promise.all([
        transaction.get(revieweeRef),
        transaction.get(reviewRef),
      ]);
      if (!userSnap.exists || reviewSnap.get("ratingCounted") === true) return false;
      const count = numberOr(userSnap.get("ratingCount"), 0);
      const average = numberOr(userSnap.get("ratingAverage"), 0);
      const newCount = count + 1;
      const newAverage = Math.round(((average * count + rating) / newCount) * 100) / 100;
      transaction.update(revieweeRef, { ratingAverage: newAverage, ratingCount: newCount });
      transaction.update(reviewRef, { ratingCounted: true });
      return true;
    });

    if (counted) {
      const reviewerName = await getDisplayName(reviewerId);
      await createNotification({
        userId: revieweeId,
        type: "NEW_REVIEW",
        title: `New ${rating}-Star Review`,
        body: `${reviewerName} reviewed your session.`,
        referenceId: reviewId,
      });
    }

    await awardXp({
      userId: reviewerId,
      amount: XP_PER_REVIEW,
      type: "EARN",
      reason: "REVIEW_GIVEN",
      referenceId: sessionId,
      transactionId: `review_${sessionId}_${reviewerId}`,
    });
    await checkBadges(reviewerId);
  },
);
