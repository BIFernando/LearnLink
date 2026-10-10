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

//Get a single session
export async function getSession(sessionId:string): Promise<Session |null> {
    const sessionRef=doc(db, "sessions", sessionId);
    const snapshot=await getDoc(sessionRef);

    if(!snapshot){
        return null;
    }

    return {
        id:snapshot.id,
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
export async function updateSessionStatus(
    sessionId:string,
    status:Session["status"]
){
    const sessionRef= doc(db, "sessions", sessionId);

    await updateDoc(sessionRef,{
        status,
        updatedAt:serverTimestamp(),
    });
}


export async function confirmSessionCompletion(
  sessionId: string,
  userId: string
): Promise<"WAITING_FOR_OTHER" | "COMPLETED"> {
  const sessionRef = doc(db, "sessions", sessionId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("Session not found.");
    }

    const data = snapshot.data();

    if (
      userId !== data.teacherId &&
      userId !== data.learnerId
    ) {
      throw new Error("You are not a participant in this session.");
    }

    if (!["CONFIRMED", "IN_PROGRESS"].includes(data.status)) {
      throw new Error("This session is not ready for completion confirmation.");
    }

    const completedBy: string[] = data.completedBy ?? [];

    if (completedBy.includes(userId)) {
      return data.status === "COMPLETED"
        ? "COMPLETED"
        : "WAITING_FOR_OTHER";
    }

    const updatedCompletedBy = [...completedBy, userId];

    const bothConfirmed =
      updatedCompletedBy.includes(data.teacherId) &&
      updatedCompletedBy.includes(data.learnerId);

    transaction.update(sessionRef, {
      completedBy: updatedCompletedBy,
      ...(bothConfirmed ? { status: "COMPLETED" } : {}),
      updatedAt: serverTimestamp(),
    });

    return bothConfirmed ? "COMPLETED" : "WAITING_FOR_OTHER";
  });
}
