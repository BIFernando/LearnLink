import type { Timestamp } from "firebase/firestore";

export interface Conversation {
  conversationId: string;
  participantIds: string[];
  exchangeRequestId: string;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp | null;
}

export interface Message {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
  isRead: boolean;
}
