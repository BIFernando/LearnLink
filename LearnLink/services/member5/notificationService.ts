import type { Href } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/config/firebase";
import { MEMBER5_COLLECTIONS, type AppNotification, type NotificationType } from "@/types/member5";

const NOTIFICATIONS_LIMIT = 100;

/**
 * Notifications are created only by Cloud Functions.
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
