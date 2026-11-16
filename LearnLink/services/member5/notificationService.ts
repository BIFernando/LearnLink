import type { Href } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/config/firebase";
import { MEMBER5_COLLECTIONS, type AppNotification, type NotificationType } from "@/types/member5";

const NOTIFICATIONS_LIMIT = 100;

/**
 * Notifications are created by Cloud Functions, except exchange events, which the
 * client also creates (see notifyExchangeEvent) so they work on the Spark plan.
 * Clients can read their own, flip isRead, and delete (dismiss).
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

/** Live unread count, for badges on entry points. */
export function useUnreadNotificationCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    return subscribeToNotifications(
      userId,
      (notifications) => setCount(notifications.filter((item) => !item.isRead).length),
      () => setCount(0),
    );
  }, [userId]);
  return count;
}

// ============================================
// Exchange notifications (client-side, Spark plan)
// ============================================

export type ExchangeNotificationType = "EXCHANGE_REQUEST" | "REQUEST_ACCEPTED" | "REQUEST_REJECTED";

/**
 * Deterministic id shared with the onExchangeRequestWritten Cloud Function, so the
 * client and the function write the same document instead of duplicates.
 */
export function exchangeNotificationId(
  type: ExchangeNotificationType,
  requestId: string,
  userId: string,
): string {
  return `${type}_${requestId}_${userId}`;
}

const EXCHANGE_STATUS_TO_TYPE: Partial<Record<string, ExchangeNotificationType>> = {
  PENDING: "EXCHANGE_REQUEST",
  ACCEPTED: "REQUEST_ACCEPTED",
  REJECTED: "REQUEST_REJECTED",
};

async function displayNameOf(userId: string): Promise<string> {
  const snapshot = await getDoc(doc(db, "users", userId));
  const name = snapshot.get("displayName");
  return typeof name === "string" && name.trim() ? name : "A LearnLink peer";
}

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

    // If the Cloud Function already wrote this doc, the rules reject this write
    // (it would be an update), which is fine: the notification exists.
    await setDoc(
      doc(db, MEMBER5_COLLECTIONS.notifications, exchangeNotificationId(type, requestId, recipientId)),
      {
        userId: recipientId,
        type,
        ...content[type],
        referenceId: requestId,
        isRead: false,
        createdAt: serverTimestamp(),
      },
    );
  } catch (error) {
    console.warn(`Could not create ${type} notification for ${requestId}:`, error);
  }
}

// ============================================
// Type → screen routing
// ============================================

export const SESSION_NOTIFICATION_TYPES: NotificationType[] = [
  "EXCHANGE_REQUEST",
  "REQUEST_ACCEPTED",
  "REQUEST_REJECTED",
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
