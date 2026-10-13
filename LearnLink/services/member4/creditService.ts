import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc, getDoc,
} from "firebase/firestore";

import { db } from "../../config/firebase";
import { CreditTransaction } from "../../types/member4/member4";

//Get credit transactions
export async function getCreditTransactions(userId:string)
    :Promise<CreditTransaction[]>{
        const transactionsRef = collection(
            db,
            "creditTransactions"
        );

        const q = query(
            transactionsRef,
            where ("userId","==", userId),
            orderBy("createdAt","desc")
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map((document)=>({
            id:document.id,
            ...document.data(),
        })) as CreditTransaction[];
    }

    // Retrieve the user's current skill-credit balance.
export async function getCreditBalance(
  userId: string
): Promise<number> {
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("User profile not found.");
  }

  const balance = snapshot.data().skillCredits;

  return typeof balance === "number" ? balance : 0;
}
