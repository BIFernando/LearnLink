import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  or,
  runTransaction,
} from "firebase/firestore";

import { getCurrentUserId } from "./currentUser";

import { db } from "../../config/firebase";
import { Session } from "../../types/member4/member4";
import { CREDITS_PER_SESSION } from "./creditService";

// Get sessions where the user is either the teacher or learner.
export async function getUserSessions(
  userId: string
): Promise<Session[]> {
  const q = query(
    sessionRef,
    or(
      where("teacherId", "==", userId),
      where("learnerId", "==", userId)
    ),
    orderBy("scheduledAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Session[];
}

const sessionRef = collection(db, "sessions");

// Create a session and prevent identical duplicate sessions.
export async function createSession(
  session: Omit<Session, "id" | "createdAt" | "updatedAt">
) {
  // Check for an existing session with the same details.
  const duplicateQuery = query(
    sessionRef,
    where("exchangeRequestId", "==", session.exchangeRequestId),
    where("teacherId", "==", session.teacherId),
    where("learnerId", "==", session.learnerId),
    where("skillId", "==", session.skillId),
    where("scheduledAt", "==", session.scheduledAt)
  );

  const existingSessions = await getDocs(duplicateQuery);

  if (!existingSessions.empty) {
    throw new Error(
      "An identical session has already been scheduled."
    );
  }

  // Create the session if no duplicate exists.
  const docRef = await addDoc(sessionRef, {
    ...session,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

// Get a single session
export async function getSession(
  sessionId: string
): Promise<Session | null> {
  const sessionDocRef = doc(db, "sessions", sessionId);
  const snapshot = await getDoc(sessionDocRef);

  // Check whether the document actually exists
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Session;
}

//Get teacher's sessions
export async function getTeacherSession(userId: string) {
  const q = query(
    sessionRef,
    where("teacherId", "==", userId),
    orderBy("scheduledAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Session[];
}

//Update session status
// Define allowed session status transitions
const allowedSessionTransitions: Record<
  Session["status"],
  Session["status"][]
> = {
  PROPOSED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
  IN_PROGRESS: ["CANCELLED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};

// Update session status with validation
export async function updateSessionStatus(
  sessionId: string,
  newStatus: Session["status"]
) {
  const sessionDocRef = doc(db, "sessions", sessionId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionDocRef);

    if (!snapshot.exists()) {
      throw new Error("Session not found.");
    }

    const currentUserId = getCurrentUserId();

    const sessionData = snapshot.data() as Session;

    const isTeacher = sessionData.teacherId === currentUserId;
    const isLearner = sessionData.learnerId === currentUserId;

    if (!isTeacher && !isLearner) {
      throw new Error("You are not authorized to modify this session.");
    }

    const currentStatus = snapshot.data().status as Session["status"];

    if (!allowedSessionTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Cannot change session status from ${currentStatus} to ${newStatus}.`
      );
    }

    transaction.update(sessionDocRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  });
}


export async function confirmSessionCompletion(
  sessionId: string
): Promise<
  "WAITING_FOR_OTHER" | "COMPLETED" | "COMPLETED_WITH_CREDITS"
> {
  const sessionDocRef = doc(db, "sessions", sessionId);
  const currentUserId = getCurrentUserId();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionDocRef);

    if (!snapshot.exists()) {
      throw new Error("Session not found.");
    }

    const data = snapshot.data() as Session;

    if (
      currentUserId !== data.teacherId &&
      currentUserId !== data.learnerId
    ) {
      throw new Error("You are not a participant in this session.");
    }

const completedBy = data.completedBy ?? [];

// Handle repeated confirmation first.
if (completedBy.includes(currentUserId)) {
  if (data.status === "COMPLETED") {
    return data.creditsTransferred
      ? "COMPLETED_WITH_CREDITS"
      : "COMPLETED";
  }

  return "WAITING_FOR_OTHER";
}

// Only allow new confirmations for active sessions.
if (!["CONFIRMED", "IN_PROGRESS"].includes(data.status)) {
  throw new Error("This session is not ready for completion confirmation.");
}

    if (completedBy.includes(currentUserId)) {
      if (data.status === "COMPLETED") {
        return data.creditsTransferred
          ? "COMPLETED_WITH_CREDITS"
          : "COMPLETED";
      }

      return "WAITING_FOR_OTHER";
    }

    const updatedCompletedBy = [...completedBy, currentUserId];

    const bothConfirmed =
      updatedCompletedBy.includes(data.teacherId) &&
      updatedCompletedBy.includes(data.learnerId);

    if (!bothConfirmed) {
      transaction.update(sessionDocRef, {
        completedBy: updatedCompletedBy,
        updatedAt: serverTimestamp(),
      });

      return "WAITING_FOR_OTHER";
    }

    const exchangeRequestRef = doc(
      db,
      "exchangeRequests",
      data.exchangeRequestId
    );
    const exchangeSnapshot = await transaction.get(exchangeRequestRef);

    if (!exchangeSnapshot.exists()) {
      throw new Error("The exchange request for this session was not found.");
    }

    const exchange = exchangeSnapshot.data();

    if (exchange.status !== "ACCEPTED") {
      throw new Error("The exchange request is no longer accepted.");
    }

    const isOfferedSkillSession =
      data.skillId === exchange.offeredSkillId &&
      data.teacherId === exchange.senderId &&
      data.learnerId === exchange.receiverId;
    const isRequestedSkillSession =
      data.skillId === exchange.requestedSkillId &&
      data.teacherId === exchange.receiverId &&
      data.learnerId === exchange.senderId;

    if (!isOfferedSkillSession && !isRequestedSkillSession) {
      throw new Error(
        "The session participants or skill do not match the exchange request."
      );
    }

    let result: "COMPLETED" | "COMPLETED_WITH_CREDITS" = "COMPLETED";
    let creditsTransferred = false;

    if (exchange.exchangeType === "CREDIT") {
      const teacherRef = doc(db, "users", data.teacherId);
      const learnerRef = doc(db, "users", data.learnerId);
      const earnTransactionRef = doc(
        db,
        "creditTransactions",
        `${sessionId}_EARN`
      );
      const spendTransactionRef = doc(
        db,
        "creditTransactions",
        `${sessionId}_SPEND`
      );

      const teacherSnapshot = await transaction.get(teacherRef);
      const learnerSnapshot = await transaction.get(learnerRef);
      const earnTransactionSnapshot = await transaction.get(earnTransactionRef);
      const spendTransactionSnapshot = await transaction.get(spendTransactionRef);

      if (!teacherSnapshot.exists() || !learnerSnapshot.exists()) {
        throw new Error("A participant user profile could not be found.");
      }

      if (
        earnTransactionSnapshot.exists() ||
        spendTransactionSnapshot.exists()
      ) {
        throw new Error(
          "Credit transactions already exist for this session; no additional transfer was made."
        );
      }

      const teacherCredits = teacherSnapshot.get("skillCredits");
      const learnerCredits = learnerSnapshot.get("skillCredits");

      if (
        (teacherCredits !== undefined &&
          (typeof teacherCredits !== "number" ||
            !Number.isFinite(teacherCredits) ||
            teacherCredits < 0)) ||
        (learnerCredits !== undefined &&
          (typeof learnerCredits !== "number" ||
            !Number.isFinite(learnerCredits) ||
            learnerCredits < 0))
      ) {
        throw new Error("A participant has an invalid skill-credit balance.");
      }

      const currentTeacherCredits =
        typeof teacherCredits === "number" ? teacherCredits : 0;
      const currentLearnerCredits =
        typeof learnerCredits === "number" ? learnerCredits : 0;

      if (currentLearnerCredits < CREDITS_PER_SESSION) {
        throw new Error(
          `The learner has insufficient credits. At least ${CREDITS_PER_SESSION} credits are required.`
        );
      }

      transaction.update(learnerRef, {
        skillCredits: currentLearnerCredits - CREDITS_PER_SESSION,
        updatedAt: serverTimestamp(),
      });
      transaction.update(teacherRef, {
        skillCredits: currentTeacherCredits + CREDITS_PER_SESSION,
        updatedAt: serverTimestamp(),
      });
      transaction.set(earnTransactionRef, {
        userId: data.teacherId,
        amount: CREDITS_PER_SESSION,
        type: "EARN",
        referenceId: sessionId,
        description: `Credits earned for completed session ${sessionId}.`,
        createdAt: serverTimestamp(),
      });
      transaction.set(spendTransactionRef, {
        userId: data.learnerId,
        amount: CREDITS_PER_SESSION,
        type: "SPEND",
        referenceId: sessionId,
        description: `Credits spent for completed session ${sessionId}.`,
        createdAt: serverTimestamp(),
      });

      result = "COMPLETED_WITH_CREDITS";
      creditsTransferred = true;
    } else if (exchange.exchangeType !== "DIRECT") {
      throw new Error("The exchange request has an unsupported exchange type.");
    }

    transaction.update(sessionDocRef, {
      completedBy: [data.teacherId, data.learnerId],
      status: "COMPLETED",
      creditsTransferred,
      updatedAt: serverTimestamp(),
    });

    return result;
  });
}
