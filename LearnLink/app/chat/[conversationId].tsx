import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { chatColors as colors } from "@/constants/chatColors";
import { useAuth } from "@/providers/AuthProvider";
import {
  markMessageAsRead,
  sendMessage,
  subscribeToMessages,
} from "@/services/chatService";
import type { Message } from "@/types/chat.types";

function formatTime(timestamp: any) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ConversationScreen() {
  const { conversationId, otherUserName } = useLocalSearchParams<{
    conversationId: string;
    otherUserName?: string;
  }>();
  const { user } = useAuth();
  const userId = user?.uid;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);

      newMessages.forEach((msg) => {
        if (!msg.isRead && msg.senderId !== userId) {
          markMessageAsRead(conversationId, msg.messageId).catch(console.error);
        }
      });
    });

    return () => unsubscribe();
  }, [conversationId, userId]);

  const handleSend = async () => {
    if (!text.trim() || sending || !conversationId || !userId) return;

    setSending(true);
    try {
      await sendMessage(conversationId, userId, text.trim());
      setText("");
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === userId;

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.messageWrapperRight : styles.messageWrapperLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.messageBubbleRight : styles.messageBubbleLeft,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.messageTextRight : styles.messageTextLeft,
            ]}
          >
            {item.text}
          </Text>
        </View>
        <Text style={styles.timestampText}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: otherUserName || "Conversation" }} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.messageId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="attach" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={text}
              onChangeText={setText}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!text.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="send" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16 },
  messageWrapper: { marginBottom: 16, maxWidth: "80%" },
  messageWrapperLeft: { alignSelf: "flex-start" },
  messageWrapperRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  messageBubble: { padding: 12, borderRadius: 16 },
  messageBubbleLeft: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  messageBubbleRight: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextLeft: { color: colors.textPrimary },
  messageTextRight: { color: colors.white },
  timestampText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "flex-end",
  },
  attachButton: { padding: 8, marginRight: 4, marginBottom: 4 },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    minHeight: 40,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonDisabled: { backgroundColor: colors.primaryLight },
});
