import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Conversation, Message } from '@/types/chat.types';

const CONVERSATIONS_COLLECTION = 'conversations';

// ============================================
// 1. SUBSCRIBE TO CONVERSATIONS
// ============================================
export const subscribeToConversations = (userId: string, onUpdate: (conversations: Conversation[]) => void) => {
  const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
  const q = query(
    conversationsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      conversationId: doc.id,
      ...doc.data()
    })) as Conversation[];
    onUpdate(conversations);
  }, (error) => {
    console.error("Error subscribing to conversations: ", error);
  });
};

// ============================================
// 2. SUBSCRIBE TO MESSAGES
// ============================================
export const subscribeToMessages = (conversationId: string, onUpdate: (messages: Message[]) => void) => {
  const messagesRef = collection(db, `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      messageId: doc.id,
      ...doc.data()
    })) as Message[];
    onUpdate(messages);
  }, (error) => {
    console.error("Error subscribing to messages: ", error);
  });
};

// ============================================
// 3. SEND MESSAGE
// ============================================
export const sendMessage = async (conversationId: string, senderId: string, text: string) => {
  try {
    const messagesRef = collection(db, `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`);
    
    // Add the new message
    await addDoc(messagesRef, {
      senderId,
      text,
      createdAt: serverTimestamp(),
      isRead: false
    });

    // Update the conversation's last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(conversationRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// ============================================
// 4. MARK MESSAGE AS READ
// ============================================
export const markMessageAsRead = async (conversationId: string, messageId: string) => {
  try {
    const messageRef = doc(db, `${CONVERSATIONS_COLLECTION}/${conversationId}/messages`, messageId);
    await updateDoc(messageRef, {
      isRead: true
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// ============================================
// 5. CREATE CONVERSATION (Helper)
// ============================================
export const createConversation = async (participantIds: string[], exchangeRequestId: string) => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    
    // Check if conversation already exists for these participants (simplified check)
    // For a robust app, you might want to query explicitly.
    
    const docRef = await addDoc(conversationsRef, {
      participantIds,
      exchangeRequestId,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};
