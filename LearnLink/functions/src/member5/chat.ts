import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";

import { COLLECTIONS, REGION, createNotification, db, getDisplayName, truncate } from "./shared";

/**
 * New message → conversation preview + unread counts + one collapsed NEW_MESSAGE
 * notification per recipient and conversation.
 */
export const onMessageCreated = onDocumentCreated(
  { document: "conversations/{conversationId}/messages/{messageId}", region: REGION },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;
    const { conversationId } = event.params;
    const senderId = typeof message.senderId === "string" ? message.senderId : "";
    const text = typeof message.text === "string" ? message.text : "";

    const conversationRef = db().collection(COLLECTIONS.conversations).doc(conversationId);
    const conversation = await conversationRef.get();
    if (!conversation.exists) return;

    const participants = (conversation.get("participantIds") as string[] | undefined) ?? [];
    const recipients = participants.filter((id) => id !== senderId);

    const update: Record<string, unknown> = {
      lastMessage: truncate(text, 200),
      lastMessageAt: message.createdAt ?? FieldValue.serverTimestamp(),
    };
    recipients.forEach((id) => {
      update[`unreadCounts.${id}`] = FieldValue.increment(1);
    });
    await conversationRef.update(update);

    const senderName = await getDisplayName(senderId);
    await Promise.all(
      recipients.map((recipientId) =>
        createNotification(
          {
            userId: recipientId,
            type: "NEW_MESSAGE",
            title: senderName,
            body: truncate(text, 140),
            referenceId: conversationId,
          },
          `msg_${conversationId}_${recipientId}`,
        ),
      ),
    );
  },
);

/**
 * Exchange request lifecycle (Member 4's collection, read-only here):
 * created → EXCHANGE_REQUEST to the receiver;
 * ACCEPTED → REQUEST_ACCEPTED to the sender + the conversation is created;
 * REJECTED → REQUEST_REJECTED to the sender.
 */
export const onExchangeRequestWritten = onDocumentWritten(
  { document: "exchangeRequests/{requestId}", region: REGION },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    const { requestId } = event.params;
    const senderId = after.senderId as string;
    const receiverId = after.receiverId as string;

    if (!before && after.status === "PENDING") {
      const senderName = await getDisplayName(senderId);
      await createNotification({
        userId: receiverId,
        type: "EXCHANGE_REQUEST",
        title: "New Swap Offer",
        body: `${senderName} proposed a skill exchange with you.`,
        referenceId: requestId,
      });
      return;
    }

    if (!before || before.status === after.status) return;

    if (after.status === "ACCEPTED") {
      const conversationRef = db().collection(COLLECTIONS.conversations).doc(requestId);
      await conversationRef
        .create({
          participantIds: [senderId, receiverId],
          exchangeRequestId: requestId,
          lastMessage: "",
          lastMessageAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          unreadCounts: { [senderId]: 0, [receiverId]: 0 },
        })
        .catch(() => undefined); // already created from the app

      const receiverName = await getDisplayName(receiverId);
      await createNotification({
        userId: senderId,
        type: "REQUEST_ACCEPTED",
        title: "Swap Accepted",
        body: `${receiverName} accepted your exchange request. Say hi in chat!`,
        referenceId: requestId,
      });
    } else if (after.status === "REJECTED") {
      const receiverName = await getDisplayName(receiverId);
      await createNotification({
        userId: senderId,
        type: "REQUEST_REJECTED",
        title: "Swap Declined",
        body: `${receiverName} declined your exchange request.`,
        referenceId: requestId,
      });
    }
  },
);
