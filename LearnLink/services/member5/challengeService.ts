import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/config/firebase";
import {
  MEMBER5_COLLECTIONS,
  type Challenge,
  type ChallengeAttempt,
  type SubmitChallengeAttemptRequest,
  type SubmitChallengeAttemptResponse,
} from "@/types/member5";

export async function getActiveChallenges(): Promise<Challenge[]> {
  const snapshot = await getDocs(
    query(
      collection(db, MEMBER5_COLLECTIONS.challenges),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
    ),
  );
  return snapshot.docs.map((challengeDoc) => ({ challengeId: challengeDoc.id, ...challengeDoc.data() }) as Challenge);
}

export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  const snapshot = await getDoc(doc(db, MEMBER5_COLLECTIONS.challenges, challengeId));
  return snapshot.exists() ? ({ challengeId: snapshot.id, ...snapshot.data() } as Challenge) : null;
}

export async function getMyAttempts(userId: string): Promise<ChallengeAttempt[]> {
  const snapshot = await getDocs(
    query(collection(db, MEMBER5_COLLECTIONS.challengeAttempts), where("userId", "==", userId)),
  );
  return snapshot.docs.map((attemptDoc) => ({ attemptId: attemptDoc.id, ...attemptDoc.data() }) as ChallengeAttempt);
}

/** Answers are graded by the submitChallengeAttempt Cloud Function; the client never sees the key. */
export async function submitChallengeAttempt(
  request: SubmitChallengeAttemptRequest,
): Promise<SubmitChallengeAttemptResponse> {
  const callable = httpsCallable<SubmitChallengeAttemptRequest, SubmitChallengeAttemptResponse>(
    functions,
    "submitChallengeAttempt",
  );
  const result = await callable(request);
  return result.data;
}
