import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { checkBadges } from "./badges";
import { COLLECTIONS, REGION, awardXp, db, numberOr } from "./shared";

interface SubmitRequest {
  challengeId: string;
  answers: number[];
}

interface QuestionResult {
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string | null;
}

function parseRequest(data: unknown): SubmitRequest {
  if (typeof data !== "object" || data === null) {
    throw new HttpsError("invalid-argument", "Missing challenge submission.");
  }
  const { challengeId, answers } = data as Record<string, unknown>;
  if (typeof challengeId !== "string" || !challengeId || challengeId.includes("/")) {
    throw new HttpsError("invalid-argument", "Invalid challengeId.");
  }
  if (
    !Array.isArray(answers) ||
    answers.length > 100 ||
    answers.some((answer) => !Number.isInteger(answer) || answer < -1 || answer > 20)
  ) {
    throw new HttpsError("invalid-argument", "Invalid answers.");
  }
  return { challengeId, answers: answers as number[] };
}

/**
 * Grades a challenge against challengeAnswers/{challengeId} (never readable by clients),
 * records challengeAttempts, and awards XP on the first attempt only.
 */
export const submitChallengeAttempt = onCall({ region: REGION }, async (request) => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError("unauthenticated", "Sign in to play challenges.");
  const { challengeId, answers } = parseRequest(request.data);

  const firestore = db();
  const [challengeSnap, answerSnap] = await Promise.all([
    firestore.collection(COLLECTIONS.challenges).doc(challengeId).get(),
    firestore.collection(COLLECTIONS.challengeAnswers).doc(challengeId).get(),
  ]);
  if (!challengeSnap.exists || challengeSnap.get("isActive") !== true) {
    throw new HttpsError("not-found", "This challenge is not available.");
  }

  const questions = (challengeSnap.get("questions") as { options?: unknown[]; explanation?: unknown }[]) ?? [];
  const key = answerSnap.get("correctOptionIndexes") as unknown;
  if (!Array.isArray(key) || key.length !== questions.length) {
    throw new HttpsError("failed-precondition", "This challenge has no answer key yet.");
  }
  if (answers.length !== questions.length) {
    throw new HttpsError("invalid-argument", `Expected ${questions.length} answers.`);
  }

  const results: QuestionResult[] = questions.map((question, index) => {
    const correctIndex = numberOr(key[index], -1);
    const selectedIndex = answers[index];
    return {
      selectedIndex,
      correctIndex,
      isCorrect: selectedIndex === correctIndex,
      explanation: typeof question.explanation === "string" ? question.explanation : null,
    };
  });
  const correctCount = results.filter((result) => result.isCorrect).length;
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  // First attempt (and only the first) earns XP; xpTransactions id makes it idempotent.
  const previous = await firestore
    .collection(COLLECTIONS.challengeAttempts)
    .where("userId", "==", userId)
    .where("challengeId", "==", challengeId)
    .limit(1)
    .get();
  const isFirstAttempt = previous.empty;
  const potentialXp = Math.round((numberOr(challengeSnap.get("xpReward"), 0) * score) / 100);

  const attemptRef = firestore.collection(COLLECTIONS.challengeAttempts).doc();
  let xpEarned = 0;
  if (isFirstAttempt && potentialXp > 0) {
    const award = await awardXp({
      userId,
      amount: potentialXp,
      type: "EARN",
      reason: "CHALLENGE_COMPLETED",
      referenceId: challengeId,
      transactionId: `challenge_${challengeId}_${userId}`,
      withStreakBonus: true,
    });
    xpEarned = award.totalAwarded;
  }

  await attemptRef.set({
    challengeId,
    userId,
    score,
    xpEarned,
    completedAt: FieldValue.serverTimestamp(),
  });
  await checkBadges(userId);

  return {
    attemptId: attemptRef.id,
    score,
    correctCount,
    totalQuestions: questions.length,
    xpEarned,
    isFirstAttempt,
    results,
  };
});
