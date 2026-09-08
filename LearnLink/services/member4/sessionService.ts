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
} from "firebase/firestore";

import { db } from "../../config/firebase";
import { Session } from "../../types/member4/member4";

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