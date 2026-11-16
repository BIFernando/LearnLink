import { format } from "date-fns";
import type { Href } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { auth, db } from "@/config/firebase";
import { MEMBER5_COLLECTIONS, type AppNotification, type NotificationType } from "@/types/member5";

const NOTIFICATIONS_LIMIT = 100;

/**
 * Notifications are created by Cloud Functions on Blaze. On the Spark plan the app
 * creates the event notifications itself (notifyExchangeEvent, notifyNewMessage,
 * notifyNewReview, notifySessionEvent) with the same deterministic ids, so both
 * paths write one document. Clients can read their own, flip isRead, and delete.
 */
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(
    collection(db, MEMBER5_COLLECTIONS.notifications),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(NOTIFICATIONS_LIMIT),
  );
  return onSnapshot(
    q,
    (snapshot) =>
      onUpdate(
        snapshot.docs.map(
          (notificationDoc) =>
            ({ notificationId: notificationDoc.id, ...notificationDoc.data() }) as AppNotification,
        ),
      ),
    onError,
  );
}

/** Equality-only query: served by single-field indexes, no composite index needed. */
function unreadNotificationsQuery(userId: string) {
  return query(
    collection(db, MEMBER5_COLLECTIONS.notifications),
    where("userId", "==", userId),
    where("isRead", "==", false),
  );
}

export function markNotificationRead(notificationId: string) {
  return updateDoc(doc(db, MEMBER5_COLLECTIONS.notifications, notificationId), { isRead: true });
}

export async function markAllNotificationsRead(notifications: AppNotification[]) {
  const unread = notifications.filter((notification) => !notification.isRead);
  // Firestore batches hold up to 500 writes; the list is capped at 100.
  const batch = writeBatch(db);
  unread.forEach((notification) =>
    batch.update(doc(db, MEMBER5_COLLECTIONS.notifications, notification.notificationId), {
      isRead: true,
    }),
  );
  await batch.commit();
}

export function dismissNotification(notificationId: string) {
  return deleteDoc(doc(db, MEMBER5_COLLECTIONS.notifications, notificationId));
}

/** Marks my unread NEW_MESSAGE notifications for a conversation as read. Never throws. */
export async function markConversationNotificationsRead(
  userId: string,
  conversationId: string,
): Promise<void> {
  try {
    const snapshot = await getDocs(unreadNotificationsQuery(userId));
    const matching = snapshot.docs.filter(
      (item) => item.get("type") === "NEW_MESSAGE" && item.get("referenceId") === conversationId,
    );
    if (matching.length === 0) return;
    const batch = writeBatch(db);
    matching.slice(0, 500).forEach((item) => batch.update(item.ref, { isRead: true }));
    await batch.commit();
  } catch (error) {
    console.warn(`Could not mark message notifications read for ${conversationId}:`, error);
  }
}

/** Live unread count, for the header bell badge and other entry points. */
export function useUnreadNotificationCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (!userId) return;
    return onSnapshot(
      unreadNotificationsQuery(userId),
      (snapshot) => setCount(snapshot.size),
      () => setCount(0),
    );
  }, [userId]);
  return count;
}

/** Notifications older than this when they first show up are not popped up. */
const NEW_NOTIFICATION_MAX_AGE_MS = 2 * 60_000;

/**
 * Calls onNew for each unread notification that arrives after the listener starts.
 * The first snapshot (what was already there at app start) is never reported.
 */
export function subscribeToNewNotifications(
  userId: string,
  onNew: (notification: AppNotification) => void,
) {
  let initialized = false;
  return onSnapshot(
    unreadNotificationsQuery(userId),
    (snapshot) => {
      if (!initialized) {
        initialized = true;
        return;
      }
      snapshot
        .docChanges()
        .filter((change) => change.type === "added")
        .forEach((change) => {
          const notification = {
            notificationId: change.doc.id,
            ...change.doc.data({ serverTimestamps: "estimate" }),
          } as AppNotification;
          const createdAt = (notification.createdAt as Timestamp | null)?.toMillis?.();
          if (createdAt && Date.now() - createdAt > NEW_NOTIFICATION_MAX_AGE_MS) return;
          onNew(notification);
        });
    },
    (error) => console.warn("Notification listener failed:", error),
  );
}

// ============================================
// Client-created notifications (Spark plan)
// ============================================

/**
 * Deterministic id `${type}_${key}_${userId}` shared with the Cloud Functions
 * (functions/src/member5/shared.ts → notificationDocId), so the client and the
 * function write the same document instead of duplicates.
 */
export function notificationDocId(type: NotificationType, key: string, userId: string): string {
  return `${type}_${key}_${userId}`;
}

export type ExchangeNotificationType = "EXCHANGE_REQUEST" | "REQUEST_ACCEPTED" | "REQUEST_REJECTED";

export function exchangeNotificationId(
  type: ExchangeNotificationType,
  requestId: string,
  userId: string,
): string {
  return notificationDocId(type, requestId, userId);
}

// Must match the limits in firestore.rules (validClientNotification).
const TITLE_MAX = 100;
const BODY_MAX = 300;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

interface ClientNotificationInput {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId: string;
}

/**
 * Create-once write: if the doc already exists (the Cloud Function or an earlier call
 * wrote it), setDoc would be an update, which the rules reject. That is fine.
 */
async function createClientNotification(input: ClientNotificationInput): Promise<void> {
  const { id, ...data } = input;
  await setDoc(doc(db, MEMBER5_COLLECTIONS.notifications, id), {
    ...data,
    title: truncate(data.title, TITLE_MAX),
    body: truncate(data.body, BODY_MAX),
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

async function displayNameOf(userId: string): Promise<string> {
  const snapshot = await getDoc(doc(db, "users", userId));
  const name = snapshot.get("displayName");
  return typeof name === "string" && name.trim() ? name : "A LearnLink peer";
}

const EXCHANGE_STATUS_TO_TYPE: Partial<Record<string, ExchangeNotificationType>> = {
  PENDING: "EXCHANGE_REQUEST",
  ACCEPTED: "REQUEST_ACCEPTED",
  REJECTED: "REQUEST_REJECTED",
};

/**
 * Notifies the other participant after an exchange request is created (status PENDING),
 * accepted or rejected. Other statuses are ignored. Never throws: the exchange action
 * has already succeeded, so a failed notification is only logged.
 */
export async function notifyExchangeEvent(requestId: string, status: string): Promise<void> {
  const type = EXCHANGE_STATUS_TO_TYPE[status];
  if (!type) return;

  try {
    const snapshot = await getDoc(doc(db, "exchangeRequests", requestId));
    if (!snapshot.exists()) return;
    const senderId = snapshot.get("senderId") as string;
    const receiverId = snapshot.get("receiverId") as string;

    // EXCHANGE_REQUEST goes to the receiver; the responses go back to the sender.
    const recipientId = type === "EXCHANGE_REQUEST" ? receiverId : senderId;
    const actorName = await displayNameOf(type === "EXCHANGE_REQUEST" ? senderId : receiverId);

    const content: Record<ExchangeNotificationType, { title: string; body: string }> = {
      EXCHANGE_REQUEST: {
        title: "New Swap Offer",
        body: `${actorName} proposed a skill exchange with you.`,
      },
      REQUEST_ACCEPTED: {
        title: "Swap Accepted",
        body: `${actorName} accepted your exchange request. Say hi in chat!`,
      },
      REQUEST_REJECTED: {
        title: "Swap Declined",
        body: `${actorName} declined your exchange request.`,
      },
    };

    await createClientNotification({
      id: exchangeNotificationId(type, requestId, recipientId),
      userId: recipientId,
      type,
      ...content[type],
      referenceId: requestId,
    });
  } catch (error) {
    console.warn(`Could not create ${type} notification for ${requestId}:`, error);
  }
}

/** NEW_MESSAGE for the recipient of a chat message. Never throws. */
export async function notifyNewMessage(input: {
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  text: string;
}): Promise<void> {
  try {
    const senderName = await displayNameOf(input.senderId);
    await createClientNotification({
      id: notificationDocId("NEW_MESSAGE", `${input.conversationId}_${input.messageId}`, input.recipientId),
      userId: input.recipientId,
      type: "NEW_MESSAGE",
      title: senderName,
      body: truncate(input.text, 140),
      referenceId: input.conversationId,
    });
  } catch (error) {
    console.warn(`Could not create NEW_MESSAGE notification for ${input.conversationId}:`, error);
  }
}

/** NEW_REVIEW for the reviewee, after the review doc is created. Never throws. */
export async function notifyNewReview(input: {
  reviewId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
}): Promise<void> {
  try {
    const reviewerName = await displayNameOf(input.reviewerId);
    await createClientNotification({
      id: notificationDocId("NEW_REVIEW", input.reviewId, input.revieweeId),
      userId: input.revieweeId,
      type: "NEW_REVIEW",
      title: `New ${input.rating}-Star Review`,
      body: `${reviewerName} reviewed your session.`,
      referenceId: input.reviewId,
    });
  } catch (error) {
    console.warn(`Could not create NEW_REVIEW notification for ${input.reviewId}:`, error);
  }
}

export type SessionNotificationType =
  | "SESSION_SCHEDULED"
  | "SESSION_CONFIRMED"
  | "SESSION_CANCELLED"
  | "SESSION_COMPLETED";

const SESSION_STATUS_TO_TYPE: Partial<Record<string, SessionNotificationType>> = {
  PROPOSED: "SESSION_SCHEDULED",
  CONFIRMED: "SESSION_CONFIRMED",
  CANCELLED: "SESSION_CANCELLED",
  COMPLETED: "SESSION_COMPLETED",
};

/**
 * Notifies the other participant after a session (Member 4) is proposed, confirmed,
 * cancelled or completed by `actorId` (default: the signed-in user). Other statuses
 * are ignored. Never throws.
 */
export async function notifySessionEvent(
  sessionId: string,
  status: string,
  actorId: string | undefined = auth.currentUser?.uid,
): Promise<void> {
  const type = SESSION_STATUS_TO_TYPE[status];
  if (!type || !actorId) return;

  try {
    const snapshot = await getDoc(doc(db, "sessions", sessionId));
    if (!snapshot.exists()) return;
    const teacherId = snapshot.get("teacherId") as string;
    const learnerId = snapshot.get("learnerId") as string;
    if (actorId !== teacherId && actorId !== learnerId) return;
    const recipientId = actorId === teacherId ? learnerId : teacherId;

    const actorName = await displayNameOf(actorId);
    const scheduledAt = (snapshot.get("scheduledAt") as Timestamp | undefined)?.toDate?.();
    const when = scheduledAt ? format(scheduledAt, "EEE d MMM, h:mm a") : "the planned time";

    const content: Record<SessionNotificationType, { title: string; body: string }> = {
      SESSION_SCHEDULED: {
        title: "New Session Proposed",
        body: `${actorName} proposed a session for ${when}.`,
      },
      SESSION_CONFIRMED: {
        title: "Session Confirmed",
        body: `${actorName} confirmed your session on ${when}.`,
      },
      SESSION_CANCELLED: {
        title: "Session Cancelled",
        body: `${actorName} cancelled your session on ${when}.`,
      },
      SESSION_COMPLETED: {
        title: "Session Completed",
        body: `You completed a skill swap with ${actorName}. How did it go? Leave a review to earn XP.`,
      },
    };

    await createClientNotification({
      id: notificationDocId(type, sessionId, recipientId),
      userId: recipientId,
      type,
      ...content[type],
      referenceId: sessionId,
    });
  } catch (error) {
    console.warn(`Could not create ${type} notification for ${sessionId}:`, error);
  }
}

// ============================================
// Type → screen routing
// ============================================

export const SESSION_NOTIFICATION_TYPES: NotificationType[] = [
  "EXCHANGE_REQUEST",
  "REQUEST_ACCEPTED",
  "REQUEST_REJECTED",
  "SESSION_SCHEDULED",
  "SESSION_CONFIRMED",
  "SESSION_CANCELLED",
  "SESSION_REMINDER",
  "SESSION_COMPLETED",
];

export const ACHIEVEMENT_NOTIFICATION_TYPES: NotificationType[] = [
  "BADGE_EARNED",
  "LEVEL_UP",
  "NEW_REVIEW",
];

export interface NotificationAction {
  label: string;
  href: Href;
}

/** Where tapping a notification goes. referenceId meaning depends on the type. */
export function notificationTarget(
  notification: AppNotification,
  userId: string,
): NotificationAction | null {
  const ref = notification.referenceId;
  switch (notification.type) {
    case "NEW_MESSAGE":
      return { label: "Reply", href: { pathname: "/chat/[conversationId]", params: { conversationId: ref } } };
    case "REQUEST_ACCEPTED":
      // The conversation id is the exchangeRequestId.
      return { label: "Open Chat", href: { pathname: "/chat/[conversationId]", params: { conversationId: ref } } };
    case "EXCHANGE_REQUEST":
    case "REQUEST_REJECTED":
      return {
        label: "View Request",
        href: { pathname: "/member4/exchange-request-details", params: { requestId: ref } },
      };
    case "SESSION_SCHEDULED":
    case "SESSION_CONFIRMED":
    case "SESSION_CANCELLED":
    case "SESSION_REMINDER":
      return {
        label: "Open Session",
        href: { pathname: "/member4/session-details", params: { sessionId: ref } },
      };
    case "SESSION_COMPLETED":
      return {
        label: "Give Review",
        href: { pathname: "/reviews/give/[sessionId]", params: { sessionId: ref } },
      };
    case "NEW_REVIEW":
      return { label: "View Reviews", href: { pathname: "/reviews/[userId]", params: { userId } } };
    case "BADGE_EARNED":
      return { label: "View Trophy Cabinet", href: "/gamification/badges" };
    case "LEVEL_UP":
      return { label: "View Progress", href: "/gamification" };
    case "NEW_MATCH":
      return { label: "View Matches", href: "/member3/MatchesScreen" };
    default:
      return null;
  }
}
