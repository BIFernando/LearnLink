import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

import { COLLECTIONS, awardXp, createNotification, db, isAlreadyExists, numberOr } from "./shared";

type BadgeRequirementType =
  | "XP_TOTAL"
  | "SESSIONS_COMPLETED"
  | "REVIEWS_GIVEN"
  | "CHALLENGES_COMPLETED"
  | "STREAK_DAYS";

const REQUIREMENT_TYPES: BadgeRequirementType[] = [
  "XP_TOTAL",
  "SESSIONS_COMPLETED",
  "REVIEWS_GIVEN",
  "CHALLENGES_COMPLETED",
  "STREAK_DAYS",
];

interface BadgeDoc {
  badgeId: string;
  name: string;
  requirement: { type: BadgeRequirementType; threshold: number };
  xpReward: number;
}

function parseBadge(id: string, data: FirebaseFirestore.DocumentData): BadgeDoc | null {
  const requirement = data.requirement as { type?: unknown; threshold?: unknown } | undefined;
  if (
    !requirement ||
    !REQUIREMENT_TYPES.includes(requirement.type as BadgeRequirementType) ||
    typeof requirement.threshold !== "number"
  ) {
    return null;
  }
  return {
    badgeId: id,
    name: typeof data.name === "string" ? data.name : "Badge",
    requirement: { type: requirement.type as BadgeRequirementType, threshold: requirement.threshold },
    xpReward: numberOr(data.xpReward, 0),
  };
}

async function progressCounts(userId: string): Promise<Record<BadgeRequirementType, number>> {
  const firestore = db();
  const count = async (query: FirebaseFirestore.Query) => (await query.count().get()).data().count;
  const sessions = firestore.collection(COLLECTIONS.sessions);

  const [userSnap, asTeacher, asLearner, reviewsGiven, challengesDone] = await Promise.all([
    firestore.collection(COLLECTIONS.users).doc(userId).get(),
    count(sessions.where("teacherId", "==", userId).where("status", "==", "COMPLETED")),
    count(sessions.where("learnerId", "==", userId).where("status", "==", "COMPLETED")),
    count(firestore.collection(COLLECTIONS.reviews).where("reviewerId", "==", userId)),
    count(firestore.collection(COLLECTIONS.challengeAttempts).where("userId", "==", userId)),
  ]);

  return {
    XP_TOTAL: numberOr(userSnap.get("xp"), 0),
    SESSIONS_COMPLETED: asTeacher + asLearner,
    REVIEWS_GIVEN: reviewsGiven,
    CHALLENGES_COMPLETED: challengesDone,
    STREAK_DAYS: numberOr(userSnap.get("streak"), 0),
  };
}

/**
 * Awards every badge whose requirement the user now meets:
 * userBadges/{userId}_{badgeId}, a BADGE_EARNED notification and the badge's XP.
 * Idempotent: an existing userBadges doc means the badge was already awarded.
 */
export async function checkBadges(userId: string): Promise<string[]> {
  const firestore = db();
  const [badgeSnap, earnedSnap, counts] = await Promise.all([
    firestore.collection(COLLECTIONS.badges).get(),
    firestore.collection(COLLECTIONS.userBadges).where("userId", "==", userId).get(),
    progressCounts(userId),
  ]);

  const earned = new Set(earnedSnap.docs.map((doc) => doc.get("badgeId") as string));
  const awarded: string[] = [];

  for (const doc of badgeSnap.docs) {
    const badge = parseBadge(doc.id, doc.data());
    if (!badge || earned.has(badge.badgeId)) continue;
    if (counts[badge.requirement.type] < badge.requirement.threshold) continue;

    try {
      await firestore
        .collection(COLLECTIONS.userBadges)
        .doc(`${userId}_${badge.badgeId}`)
        .create({ userId, badgeId: badge.badgeId, awardedAt: FieldValue.serverTimestamp() });
    } catch (error) {
      if (isAlreadyExists(error)) continue;
      throw error;
    }

    awarded.push(badge.badgeId);
    await createNotification({
      userId,
      type: "BADGE_EARNED",
      title: "Badge Unlocked",
      body: `"${badge.name}" 🏅 is now in your trophy cabinet${badge.xpReward > 0 ? ` (+${badge.xpReward} XP)` : ""}.`,
      referenceId: badge.badgeId,
    });

    if (badge.xpReward > 0) {
      await awardXp({
        userId,
        amount: badge.xpReward,
        type: "BONUS",
        reason: "BADGE_EARNED",
        referenceId: badge.badgeId,
        transactionId: `badge_${badge.badgeId}_${userId}`,
        countsForStreak: false,
      });
    }
  }

  if (awarded.length > 0) logger.info("Badges awarded", { userId, awarded });
  return awarded;
}
