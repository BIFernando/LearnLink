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
    runTransaction,
} from "firebase/firestore";

import { getCurrentUserId } from "./currentUser";
import { db } from "../../config/firebase";

import { ExchangeRequest } from "../../types/member4/member4";

const exchangeRequestsRef = collection(
    db,
    "exchangeRequests"
);

//Add a new exchange request
export async function createExchangeRequest(
    request: Omit<ExchangeRequest, "id" | "createdAt" | "updatedAt">
) {
    // Validate exchange request data
    if (!request.senderId || !request.receiverId) {
        throw new Error("Sender and receiver are required.");
    }

    if (request.senderId === request.receiverId) {
        throw new Error("You cannot create an exchange request with yourself.");
    }

    if (!request.offeredSkillId || !request.requestedSkillId) {
        throw new Error("Please select both skills.");
    }

    if (request.offeredSkillId === request.requestedSkillId) {
        throw new Error("Offered and requested skills must be different.");
    }

    if (request.creditAmount < 0) {
        throw new Error("Credit amount cannot be negative.");
    }

    if (request.exchangeType === "DIRECT" && request.creditAmount !== 0) {
        throw new Error("Direct exchanges must have zero credit amount.");
    }

    if (request.exchangeType === "CREDIT" && request.creditAmount <= 0) {
        throw new Error("Credit exchanges must have a positive credit amount.");
    }
    // Check whether a similar pending request already exists
    const duplicateQuery = query(
        exchangeRequestsRef,
        where("senderId", "==", request.senderId),
        where("receiverId", "==", request.receiverId),
        where("offeredSkillId", "==", request.offeredSkillId),
        where("requestedSkillId", "==", request.requestedSkillId),
        where("status", "==", "PENDING")
    );

    const existingRequests = await getDocs(duplicateQuery);

    if (!existingRequests.empty) {
        throw new Error(
            "You already have a pending request for this skill exchange."
        );
    }

    // Create the request if no duplicate exists
    const docRef = await addDoc(exchangeRequestsRef, {
        ...request,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
}

//Get a single request
export async function getExchangeRequest(
    requestId: string
): Promise<ExchangeRequest | null> {
    const requestRef = doc(db, "exchangeRequests", requestId);
    const snapshot = await getDoc(requestRef)

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as ExchangeRequest;
}

//Get incoming requests
export async function getIncomingRequests(userId: string) {
    const q = query(
        exchangeRequestsRef,
        where("receiverId", "==", userId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
    })) as ExchangeRequest[];
}

//Get outgoing requests
export async function getOutgoingRequests(userId: string) {
    const q = query(
        exchangeRequestsRef,
        where("senderId", "==", userId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
    })) as ExchangeRequest[];
}

//Update request status
// Define which status changes are allowed
const allowedTransitions: Record<
    ExchangeRequest["status"],
    ExchangeRequest["status"][]
> = {
    PENDING: ["ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"],
    ACCEPTED: ["CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
    EXPIRED: [],
    COMPLETED: [],
};

// Update request status only when the transition is valid
export async function updateExchangeStatus(
    requestId: string,
    newStatus: ExchangeRequest["status"]
) {
    const requestRef = doc(db, "exchangeRequests", requestId);

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(requestRef);

        if (!snapshot.exists()) {
            throw new Error("Exchange request not found.");
        }

        const currentUserId = getCurrentUserId();
        if (newStatus === "EXPIRED" || newStatus === "COMPLETED") {
            throw new Error(
                "This status can only be updated through the appropriate system workflow."
            );
        }

        const requestData = snapshot.data() as ExchangeRequest;

        // Check whether the logged-in user is involved in this exchange
        const isSender = requestData.senderId === currentUserId;
        const isReceiver = requestData.receiverId === currentUserId;

        if (!isSender && !isReceiver) {
            throw new Error("You are not authorized to modify this request.");
        }

        // Only the receiver can accept or reject
        if (
            (newStatus === "ACCEPTED" || newStatus === "REJECTED") &&
            !isReceiver
        ) {
            throw new Error("Only the receiver can accept or reject this request.");
        }

        const currentStatus = snapshot.data().status as ExchangeRequest["status"];

        if (!allowedTransitions[currentStatus].includes(newStatus)) {
            throw new Error(
                `Cannot change exchange status from ${currentStatus} to ${newStatus}.`
            );
        }

        transaction.update(requestRef, {
            status: newStatus,
            updatedAt: serverTimestamp(),
        });
    });
}
