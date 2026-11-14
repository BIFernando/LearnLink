import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar, Chip, ErrorState, LoadingState } from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import {
  MESSAGES_PAGE_SIZE,
  getConversation,
  getExchangeLabel,
  getUpcomingSession,
  markConversationAsRead,
  sendMessage,
  sessionDate,
  subscribeToMessages,
} from "@/services/chatService";
import { formatClock, formatDayLabel, toDate } from "@/services/member5/format";
import { displayNameOf, useUserProfiles } from "@/services/member5/userService";
import type { Message } from "@/types/chat.types";
import type { Session } from "@/types/member4/member4";

const QUICK_REPLIES = ["Sounds great! 🎉", "Can you send the GitHub link?", "Starting now!"];

type Row =
  | { kind: "message"; key: string; message: Message }
  | { kind: "day"; key: string; label: string };

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    conversationId: string;
    otherUserId?: string;
    otherUserName?: string;
  }>();
  const conversationId = params.conversationId;
  const { user } = useAuth();
  const userId = user?.uid;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [pageCount, setPageCount] = useState(MESSAGES_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [otherUserId, setOtherUserId] = useState(params.otherUserId ?? "");
  const [swapLabel, setSwapLabel] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<Session | null>(null);
  const markingRead = useRef(false);

  const profiles = useUserProfiles(otherUserId ? [otherUserId] : []);
  const otherProfile = profiles[otherUserId];
  const otherName = otherProfile ? displayNameOf(otherProfile) : params.otherUserName || "Conversation";

  // Partner, swap and upcoming session context.
  useEffect(() => {
    if (!conversationId || !userId) return;
    let active = true;
    getConversation(conversationId)
      .then(async (conversation) => {
        if (!active || !conversation) return;
        const other = conversation.participantIds.find((id) => id !== userId);
        if (other) setOtherUserId(other);
        const [label, session] = await Promise.all([
          getExchangeLabel(conversation.exchangeRequestId),
          getUpcomingSession(conversation.exchangeRequestId, userId).catch(() => null),
        ]);
        if (!active) return;
        setSwapLabel(label);
        setUpcoming(session);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [conversationId, userId]);

  // Live messages (newest first), growing window for pagination.
  useEffect(() => {
    if (!conversationId || !userId) return;

    return subscribeToMessages(
      conversationId,
      pageCount,
      (newMessages, more) => {
        setMessages(newMessages);
        setHasMore(more);
        setLoading(false);
        setError("");

        const hasUnreadIncoming = newMessages.some(
          (msg) => !msg.isRead && msg.senderId !== userId,
        );
        if (hasUnreadIncoming && !markingRead.current) {
          markingRead.current = true;
          markConversationAsRead(conversationId, userId)
            .catch(console.error)
            .finally(() => {
              markingRead.current = false;
            });
        }
      },
      () => {
        setError("Failed to load messages.");
        setLoading(false);
      },
    );
  }, [conversationId, userId, pageCount, retryKey]);

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    messages.forEach((message, index) => {
      result.push({ kind: "message", key: message.messageId, message });
      const day = toDate(message.createdAt);
      const olderDay = toDate(messages[index + 1]?.createdAt ?? null);
      const isOldestOfDay =
        index === messages.length - 1 || (day && olderDay && day.toDateString() !== olderDay.toDateString());
      if (isOldestOfDay && day) {
        result.push({ kind: "day", key: `day-${message.messageId}`, label: formatDayLabel(day) });
      }
    });
    return result;
  }, [messages]);

  const handleSend = async (value = text) => {
    const trimmed = value.trim();
    if (!trimmed || sending || !conversationId || !userId) return;

    setSending(true);
    setSendError("");
    try {
      await sendMessage(conversationId, userId, trimmed);
      if (value === text) setText("");
    } catch {
      setSendError("Message not sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Row }) => {
    if (item.kind === "day") {
      return (
        <View style={styles.dayPill}>
          <Text style={styles.dayText}>{item.label}</Text>
        </View>
      );
    }

    const message = item.message;
    const isMe = message.senderId === userId;

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
            {message.text}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.timestampText}>{formatClock(message.createdAt)}</Text>
          {isMe ? (
            <Ionicons
              name={message.isRead ? "checkmark-done" : "checkmark"}
              size={14}
              color={message.isRead ? colors.primary : colors.textMuted}
            />
          ) : null}
        </View>
      </View>
    );
  };

  const upcomingDate = upcoming ? sessionDate(upcoming) : null;

  return (
    <>
      <Stack.Screen options={{ title: "Peer Conversation" }} />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => {
            setLoading(true);
            setRetryKey((key) => key + 1);
          }} />
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View style={styles.partnerCard}>
            <View style={styles.partnerRow}>
              <Avatar uri={otherProfile?.profilePhotoUrl} name={otherName} size={52} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.partnerName} numberOfLines={1}>
                  {otherName}
                </Text>
                {swapLabel ? <Chip label={swapLabel} tone="mint" /> : null}
              </View>
            </View>
            {upcoming && upcomingDate ? (
              <View style={styles.upcoming}>
                <Ionicons name="school-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingLabel}>Upcoming Exchange</Text>
                  <Text style={styles.upcomingValue} numberOfLines={1}>
                    {formatDayLabel(upcomingDate)} •{" "}
                    {upcomingDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </Text>
                </View>
                <Pressable
                  style={styles.agendaButton}
                  onPress={() =>
                    router.push({
                      pathname: "/member4/session-details",
                      params: { sessionId: upcoming.id },
                    })
                  }
                >
                  <Text style={styles.agendaText}>Agenda</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <FlatList
            data={rows}
            inverted
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (hasMore) setPageCount((count) => count + MESSAGES_PAGE_SIZE);
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              hasMore ? <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primary} /> : null
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
              </View>
            }
          />

          {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplies}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_REPLIES.map((reply) => (
              <Chip key={reply} label={reply} tone="neutral" onPress={() => handleSend(reply)} />
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message or share notes..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!text.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={!text.trim() || sending}
              accessibilityLabel="Send message"
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
  partnerCard: {
    margin: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 12,
  },
  partnerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  partnerName: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  upcoming: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  upcomingLabel: { fontSize: 12, color: colors.textSecondary },
  upcomingValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  agendaButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  agendaText: { color: colors.primary, fontWeight: "700" },
  listContent: { padding: 16 },
  dayPill: {
    alignSelf: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginVertical: 12,
  },
  dayText: { fontSize: 13, color: colors.textSecondary },
  messageWrapper: { marginBottom: 14, maxWidth: "80%" },
  messageWrapperLeft: { alignSelf: "flex-start" },
  messageWrapperRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  messageBubble: { padding: 12, borderRadius: 18 },
  messageBubbleLeft: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  messageBubbleRight: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextLeft: { color: colors.textPrimary },
  messageTextRight: { color: colors.white },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  timestampText: { fontSize: 11, color: colors.textMuted },
  emptyChat: { padding: 32, alignItems: "center", transform: [{ scaleY: -1 }] },
  emptyChatText: { color: colors.textMuted, fontSize: 15 },
  sendError: { color: colors.error, paddingHorizontal: 16, paddingBottom: 4 },
  quickReplies: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "flex-end",
  },
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: colors.primaryLight },
});
