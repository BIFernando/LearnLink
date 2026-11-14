import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ExchangeRequest, Session } from '@/types/member4/member4';
import { Conversation, Message } from '@/types/chat.types';

const CONVERSATIONS_COLLECTION = 'conversations';
export const MESSAGES_PAGE_SIZE = 30;

const messagesPath = (conversationId: string) =>
  `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`;

// ============================================
// 1. SUBSCRIBE TO CONVERSATIONS
// ============================================
export const subscribeToConversations = (
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
) => {
  const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
  const q = query(
    conversationsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      conversationId: doc.id,
      ...doc.data({ serverTimestamps: 'estimate' })
    })) as Conversation[];
    onUpdate(conversations);
  }, (error) => {
    console.error("Error subscribing to conversations: ", error);
    onError?.(error);
  });
};

// ============================================
// 2. SUBSCRIBE TO MESSAGES (newest first, live window of `count` messages)
// ============================================
export const subscribeToMessages = (
  conversationId: string,
  count: number,
  onUpdate: (messages: Message[], hasMore: boolean) => void,
  onError?: (error: Error) => void
) => {
  const messagesRef = collection(db, messagesPath(conversationId));
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(count));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      messageId: doc.id,
      ...doc.data({ serverTimestamps: 'estimate' })
    })) as Message[];
    onUpdate(messages, snapshot.size >= count);
  }, (error) => {
    console.error("Error subscribing to messages: ", error);
    onError?.(error);
  });
};

// ============================================
// 3. SEND MESSAGE
// lastMessage, lastMessageAt and unreadCounts are updated by the
// onMessageCreated Cloud Function.
// ============================================
export const sendMessage = async (conversationId: string, senderId: string, text: string) => {
  try {
    await addDoc(collection(db, messagesPath(conversationId)), {
      senderId,
      text,
      createdAt: serverTimestamp(),
      isRead: false
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// ============================================
// 4. MARK CONVERSATION AS READ
// Marks every unread message from the other participant and resets my unread count.
// ============================================
export const markConversationAsRead = async (conversationId: string, userId: string) => {
  try {
    const unread = await getDocs(
      query(collection(db, messagesPath(conversationId)), where('isRead', '==', false))
    );
    const batch = writeBatch(db);
    unread.docs
      .filter((messageDoc) => messageDoc.get('senderId') !== userId)
      .forEach((messageDoc) => batch.update(messageDoc.ref, { isRead: true }));
    batch.update(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      [`unreadCounts.${userId}`]: 0
    });
    await batch.commit();
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
};

export const markAllConversationsAsRead = async (conversations: Conversation[], userId: string) => {
  const unread = conversations.filter((conv) => (conv.unreadCounts?.[userId] ?? 0) > 0);
  await Promise.all(unread.map((conv) => markConversationAsRead(conv.conversationId, userId)));
};

// ============================================
// 5. GET OR CREATE CONVERSATION
// One conversation per exchange request; its id is the exchangeRequestId.
// The onExchangeRequestWritten Cloud Function also creates it when a request is accepted.
// ============================================
export const getOrCreateConversation = async (
  exchangeRequestId: string,
  participantIds: string[]
): Promise<string> => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, exchangeRequestId);
    const existing = await getDoc(conversationRef);
    if (existing.exists()) return conversationRef.id;

    await setDoc(conversationRef, {
      participantIds,
      exchangeRequestId,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      unreadCounts: Object.fromEntries(participantIds.map((id) => [id, 0]))
    });
    return conversationRef.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  const snapshot = await getDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
  return snapshot.exists()
    ? ({ conversationId: snapshot.id, ...snapshot.data() } as Conversation)
    : null;
};

// ============================================
// 6. EXCHANGE CONTEXT (Member 4 data, read-only)
// ============================================

/** Accepted exchanges I'm part of, for starting a new chat. */
export const getAcceptedExchanges = async (userId: string): Promise<ExchangeRequest[]> => {
  const exchangesRef = collection(db, 'exchangeRequests');
  const [sent, received] = await Promise.all([
    getDocs(query(exchangesRef, where('senderId', '==', userId), where('status', '==', 'ACCEPTED'))),
    getDocs(query(exchangesRef, where('receiverId', '==', userId), where('status', '==', 'ACCEPTED'))),
  ]);
  return [...sent.docs, ...received.docs].map(
    (exchangeDoc) => ({ id: exchangeDoc.id, ...exchangeDoc.data() }) as ExchangeRequest
  );
};

const skillNameCache = new Map<string, Promise<string | null>>();

const getSkillName = (skillId: string): Promise<string | null> => {
  const cached = skillNameCache.get(skillId);
  if (cached) return cached;
  const request = getDoc(doc(db, 'skills', skillId))
    .then((snapshot) => {
      const name = snapshot.get('name');
      return typeof name === 'string' ? name : null;
    })
    .catch(() => null);
  skillNameCache.set(skillId, request);
  return request;
};

/** "Python ⇄ UI Design" for an exchange request, or null if unavailable. */
export const getExchangeLabel = async (exchangeRequestId: string): Promise<string | null> => {
  try {
    const snapshot = await getDoc(doc(db, 'exchangeRequests', exchangeRequestId));
    if (!snapshot.exists()) return null;
    const exchange = snapshot.data() as ExchangeRequest;
    const [offered, requested] = await Promise.all([
      getSkillName(exchange.offeredSkillId),
      getSkillName(exchange.requestedSkillId),
    ]);
    if (offered && requested) return `${offered} ⇄ ${requested}`;
    return offered ?? requested;
  } catch {
    return null;
  }
};

/** Next PROPOSED/CONFIRMED session for this exchange that I take part in. */
export const getUpcomingSession = async (
  exchangeRequestId: string,
  userId: string
): Promise<Session | null> => {
  const sessionsRef = collection(db, 'sessions');
  const [asTeacher, asLearner] = await Promise.all([
    getDocs(query(sessionsRef, where('exchangeRequestId', '==', exchangeRequestId), where('teacherId', '==', userId))),
    getDocs(query(sessionsRef, where('exchangeRequestId', '==', exchangeRequestId), where('learnerId', '==', userId))),
  ]);
  const now = Date.now();
  const toMillis = (value: unknown): number => {
    if (value instanceof Date) return value.getTime();
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
      return (value.toMillis as () => number)();
    }
    return Number.NaN;
  };
  return (
    [...asTeacher.docs, ...asLearner.docs]
      .map((sessionDoc) => ({ id: sessionDoc.id, ...sessionDoc.data() }) as Session)
      .filter((session) => ['PROPOSED', 'CONFIRMED'].includes(session.status))
      .filter((session) => toMillis(session.scheduledAt) >= now)
      .sort((a, b) => toMillis(a.scheduledAt) - toMillis(b.scheduledAt))[0] ?? null
  );
};

export const sessionDate = (session: Session): Date | null => {
  const value: unknown = session.scheduledAt;
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate as () => Date)();
  }
  return null;
};
