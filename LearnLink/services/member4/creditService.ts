import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
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
