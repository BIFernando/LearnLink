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

import { ExchangeRequest } from "../../types/member4/member4";

const exchangeRequestsRef = collection (
    db,
    "exchangeRequests"
);

//Add a new exchange request
export async function createExchangeRequest( 
    request: Omit<ExchangeRequest, "id"| "createdAt"| "updatedAt">)
{
    const docRef = await addDoc(exchangeRequestsRef,{
        ...request,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp(),
    });

    return docRef.id;
}

//Get a single request
export async function getExchangeRequest(
    requestId: string
): Promise<ExchangeRequest| null>{
    const requestRef = doc(db, "exchangeRequests", requestId);
    const snapshot = await getDoc(requestRef)

    if(!snapshot.exists()){
        return null;
    }

    return{
        id:snapshot.id,
        ...snapshot.data(),
    } as ExchangeRequest;
}

//Get incoming requests
export async function getIncomingRequests(userId:string){
    const q = query(
        exchangeRequestsRef,
        where("receiverId", "==", userId),
        orderBy("createdAt", "desc")
    );

    const snapshot= await getDocs(q);

    return snapshot.docs.map((document)=> ({
        id: document.id,
        ...document.data(),
    })) as ExchangeRequest[];
}

//Get outgoing requests
export async function getOutgoingRequests(userId:string){
    const q = query(
        exchangeRequestsRef,
        where("senderId", "==", userId),
        orderBy("createdAt","desc")
    );

    const snapshot= await getDocs(q);

    return snapshot.docs.map((document)=>({
        id: document.id,
        ...document.data(),
    })) as ExchangeRequest[];
}

//Update request status
export async function updateExchangeStatus(
    requestId: string,
    status: ExchangeRequest["status"]
){
    const requestRef = doc(db, "exchangeRequests", requestId);
    await updateDoc(requestRef, {
        status,
        updatedAt:serverTimestamp(),
    });
}
