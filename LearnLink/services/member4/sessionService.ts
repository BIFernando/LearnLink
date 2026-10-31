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

//Create a session
export async function createSession(
    session: Omit<Session, "id"| "createdAt"| "updatedAt">
){

    const docRef = await addDoc(sessionRef,{
        ...session,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
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
export async function getTeacherSession(userId:string){
    const q = query(
        sessionRef,
        where("teacherId", "==",userId ),
        orderBy("scheduledAt", "asc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((document)=>({
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
): Promise<"WAITING_FOR_OTHER" | "COMPLETED"> {
  const sessionDocRef = doc(db, "sessions", sessionId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionDocRef);

    if (!snapshot.exists()) {
      throw new Error("Session not found.");
    }

    const currentUserId = getCurrentUserId();
    const data = snapshot.data() as Session;

    if (
      currentUserId !== data.teacherId &&
      currentUserId !== data.learnerId
    ) {
      throw new Error("You are not a participant in this session.");
    }

    if (!["CONFIRMED", "IN_PROGRESS"].includes(data.status)) {
      throw new Error("This session is not ready for completion confirmation.");
    }

    const completedBy = data.completedBy ?? [];

    if (completedBy.includes(currentUserId)) {
      return "WAITING_FOR_OTHER";
    }

    const updatedCompletedBy = [...completedBy, currentUserId];

    const bothConfirmed =
      updatedCompletedBy.includes(data.teacherId) &&
      updatedCompletedBy.includes(data.learnerId);

    transaction.update(sessionDocRef, {
      completedBy: updatedCompletedBy,
      ...(bothConfirmed ? { status: "COMPLETED" } : {}),
      updatedAt: serverTimestamp(),
    });

    return bothConfirmed ? "COMPLETED" : "WAITING_FOR_OTHER";
  });
}
