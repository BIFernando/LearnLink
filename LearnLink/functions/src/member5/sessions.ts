import { Timestamp } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { checkBadges } from "./badges";
import {
  COLLECTIONS,
  REGION,
  awardXp,
  createNotificationOnce,
  db,
  getDisplayName,
} from "./shared";
import { XP_PER_SESSION } from "./xpRules";

/**
 * Session (Member 4) reaches COMPLETED → +XP_PER_SESSION (+ streak bonus) for both
 * participants, a SESSION_COMPLETED notification inviting a review, and badge checks.
 */
export const onSessionCompleted = onDocumentUpdated(
  { document: "sessions/{sessionId}", region: REGION },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === "COMPLETED" || after.status !== "COMPLETED") return;

    const { sessionId } = event.params;
    const participants = [after.teacherId, after.learnerId].filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );

    for (const userId of participants) {
      const result = await awardXp({
        userId,
        amount: XP_PER_SESSION,
        type: "EARN",
        reason: "SESSION_COMPLETED",
        referenceId: sessionId,
        transactionId: `session_${sessionId}_${userId}`,
        withStreakBonus: true,
      });

      const partnerId = participants.find((id) => id !== userId);
      const partnerName = partnerId ? await getDisplayName(partnerId) : "your partner";
      await createNotificationOnce(
        {
          userId,
          type: "SESSION_COMPLETED",
          title: `+${result.totalAwarded || XP_PER_SESSION} XP Earned!`,
          body: `You completed a skill swap with ${partnerName}. How did it go? Leave a review to earn more XP.`,
          referenceId: sessionId,
        },
        `completed_${sessionId}_${userId}`,
      );

      await checkBadges(userId);
    }
  },
);

/** Every 15 minutes: remind both participants of CONFIRMED sessions starting within the hour. */
export const sendSessionReminders = onSchedule(
  { schedule: "every 15 minutes", region: REGION, timeZone: "Asia/Colombo" },
  async () => {
    const now = Date.now();
    const snapshot = await db()
      .collection(COLLECTIONS.sessions)
      .where("status", "==", "CONFIRMED")
      .where("scheduledAt", ">=", Timestamp.fromMillis(now))
      .where("scheduledAt", "<=", Timestamp.fromMillis(now + 60 * 60_000))
      .get();

    for (const session of snapshot.docs) {
      const teacherId = session.get("teacherId") as string;
      const learnerId = session.get("learnerId") as string;
      const scheduledAt = (session.get("scheduledAt") as Timestamp).toDate();
      const time = scheduledAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Colombo",
      });

      for (const [userId, partnerId] of [
        [teacherId, learnerId],
        [learnerId, teacherId],
      ]) {
        const partnerName = await getDisplayName(partnerId);
        await createNotificationOnce(
          {
            userId,
            type: "SESSION_REMINDER",
            title: "Session Reminder",
            body: `Your peer exchange with ${partnerName} starts at ${time}.`,
            referenceId: session.id,
          },
          `reminder_${session.id}_${userId}`,
        );
      }
    }
  },
);
