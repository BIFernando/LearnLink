/**
 * Member 5: the ONE place for every XP number and formula.
 *
 * Used by Cloud Functions (which award XP) and imported by the app for
 * display (`@/functions/src/member5/xpRules`). Keep this file free of imports
 * so it bundles in both environments.
 */

/** XP for each participant when a session reaches COMPLETED. */
export const XP_PER_SESSION = 50;

/** XP for giving a review. Once per session per reviewer (enforced server-side). */
export const XP_PER_REVIEW = 25;

/**
 * Streak bonus added on top of session and challenge XP:
 * +5 XP per consecutive active day after the first, capped at +50.
 */
export const STREAK_BONUS_PER_DAY = 5;
export const STREAK_BONUS_MAX = 50;

/**
 * Challenge XP = round(challenge.xpReward * score / 100).
 * Only the first attempt at a challenge earns XP; retries are recorded with 0 XP.
 */
export const CHALLENGE_XP_FIRST_ATTEMPT_ONLY = true;

/** Number of users shown on the All Time leaderboard. */
export const LEADERBOARD_SIZE = 50;

/** Streak days are counted in Sri Lanka time (UTC+05:30). */
export const STREAK_TIMEZONE_OFFSET_MINUTES = 330;

/** Total XP needed to reach `level`: xpForLevel(L) = 100·(L−1)². Level 1 starts at 0. */
export function xpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 * (safeLevel - 1) ** 2;
}

/** Inverse of xpForLevel. */
export function levelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp);
  let level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
  // Guard against floating point error at exact thresholds.
  while (xpForLevel(level + 1) <= safeXp) level += 1;
  while (level > 1 && xpForLevel(level) > safeXp) level -= 1;
  return level;
}

export interface LevelProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  /** 0–1 */
  progress: number;
}

export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp);
  const level = levelFromXp(safeXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: safeXp - currentLevelXp,
    xpToNextLevel: nextLevelXp - safeXp,
    progress: span > 0 ? (safeXp - currentLevelXp) / span : 0,
  };
}

/** Bonus XP for an activity done while on a `streakDays`-day streak. */
export function streakBonus(streakDays: number): number {
  if (streakDays < 2) return 0;
  return Math.min((streakDays - 1) * STREAK_BONUS_PER_DAY, STREAK_BONUS_MAX);
}

/** "YYYY-MM-DD" for a moment in streak time. */
export function streakDayKey(date: Date): string {
  const shifted = new Date(date.getTime() + STREAK_TIMEZONE_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Streak after an XP-earning activity today.
 * Same day → unchanged (min 1). Previous day → +1. Older or never → 1.
 */
export function nextStreak(
  previousActivity: Date | null,
  currentStreak: number,
  now: Date,
): number {
  if (!previousActivity) return 1;
  const today = streakDayKey(now);
  const previous = streakDayKey(previousActivity);
  if (previous === today) return Math.max(1, currentStreak);
  const yesterday = streakDayKey(new Date(now.getTime() - 86_400_000));
  return previous === yesterday ? Math.max(1, currentStreak) + 1 : 1;
}
