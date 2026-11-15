import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/config/firebase";
import { LEADERBOARD_SIZE, streakDayKey } from "@/functions/src/member5/xpRules";
import {
  MEMBER5_COLLECTIONS,
  type Badge,
  type BadgeRequirementType,
  type GamifiedUser,
  type UserBadge,
  type XpReason,
  type XpTransaction,
} from "@/types/member5";

import { toDate } from "./format";

// ============================================
// XP transactions (read-only; written by Cloud Functions)
// ============================================

export function subscribeToXpTransactions(
  userId: string,
  count: number,
  onUpdate: (transactions: XpTransaction[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(
    collection(db, MEMBER5_COLLECTIONS.xpTransactions),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(count),
  );
  return onSnapshot(
    q,
    (snapshot) =>
      onUpdate(
        snapshot.docs.map((txDoc) => ({ transactionId: txDoc.id, ...txDoc.data() }) as XpTransaction),
      ),
    onError,
  );
}

export interface DayGain {
  key: string; // YYYY-MM-DD in streak time
  label: string; // Mon, Tue…
  xp: number;
  isToday: boolean;
}

/** XP gained on each of the last 7 streak days, oldest first. */
export function lastSevenDays(transactions: XpTransaction[], now = new Date()): DayGain[] {
  const days: DayGain[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 86_400_000);
    days.push({
      key: streakDayKey(date),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      xp: 0,
      isToday: offset === 0,
    });
  }
  const byKey = new Map(days.map((day) => [day.key, day]));
  transactions.forEach((tx) => {
    const date = toDate(tx.createdAt);
    const day = date ? byKey.get(streakDayKey(date)) : undefined;
    if (day && tx.amount > 0) day.xp += tx.amount;
  });
  return days;
}

export const XP_REASON_LABELS: Record<XpReason, string> = {
  SESSION_COMPLETED: "Completed a Skill Swap",
  REVIEW_GIVEN: "Gave a Peer Review",
  CHALLENGE_COMPLETED: "Completed a Skill Challenge",
  BADGE_EARNED: "Badge Unlocked",
  STREAK_BONUS: "Study Streak Bonus",
};

// ============================================
// Badges
// ============================================

export async function getBadges(): Promise<Badge[]> {
  const snapshot = await getDocs(collection(db, MEMBER5_COLLECTIONS.badges));
  return snapshot.docs
    .map((badgeDoc) => ({ badgeId: badgeDoc.id, ...badgeDoc.data() }) as Badge)
    .sort((a, b) => a.requirement.threshold - b.requirement.threshold);
}

export function subscribeToUserBadges(
  userId: string,
  onUpdate: (userBadges: UserBadge[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(collection(db, MEMBER5_COLLECTIONS.userBadges), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) =>
      onUpdate(
        snapshot.docs.map((badgeDoc) => ({ userBadgeId: badgeDoc.id, ...badgeDoc.data() }) as UserBadge),
      ),
    onError,
  );
}

export type BadgeProgressCounts = Record<BadgeRequirementType, number>;

/** Current value for each badge requirement type. */
export async function getBadgeProgressCounts(user: GamifiedUser): Promise<BadgeProgressCounts> {
  const count = async (q: ReturnType<typeof query>) => {
    try {
      return (await getCountFromServer(q)).data().count;
    } catch {
      return 0;
    }
  };
  const sessions = collection(db, "sessions");
  const [asTeacher, asLearner, reviewsGiven, challengesDone] = await Promise.all([
    count(query(sessions, where("teacherId", "==", user.userId), where("status", "==", "COMPLETED"))),
    count(query(sessions, where("learnerId", "==", user.userId), where("status", "==", "COMPLETED"))),
    count(query(collection(db, MEMBER5_COLLECTIONS.reviews), where("reviewerId", "==", user.userId))),
    count(query(collection(db, MEMBER5_COLLECTIONS.challengeAttempts), where("userId", "==", user.userId))),
  ]);
  return {
    XP_TOTAL: user.xp ?? 0,
    SESSIONS_COMPLETED: asTeacher + asLearner,
    REVIEWS_GIVEN: reviewsGiven,
    CHALLENGES_COMPLETED: challengesDone,
    STREAK_DAYS: user.streak ?? 0,
  };
}

// ============================================
// Leaderboard (All Time)
// ============================================

export async function getLeaderboard(): Promise<GamifiedUser[]> {
  const snapshot = await getDocs(
    query(collection(db, "users"), orderBy("xp", "desc"), limit(LEADERBOARD_SIZE)),
  );
  return snapshot.docs.map((userDoc) => {
    const data = userDoc.data();
    return {
      userId: userDoc.id,
      displayName: typeof data.displayName === "string" ? data.displayName : undefined,
      profilePhotoUrl: typeof data.profilePhotoUrl === "string" ? data.profilePhotoUrl : undefined,
      xp: typeof data.xp === "number" ? data.xp : 0,
      level: typeof data.level === "number" ? data.level : undefined,
    };
  });
}

/** 1-based rank: number of users with more XP, plus one. */
export async function getMyRank(myXp: number): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(db, "users"), where("xp", ">", myXp)),
  );
  return snapshot.data().count + 1;
}
