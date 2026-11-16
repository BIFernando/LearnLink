import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { CameraModal } from "@/components/member5/CameraModal";
import { Avatar, Chip, ErrorState, LoadingState } from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import {
  MESSAGES_PAGE_SIZE,
  getConversation,
  getExchangeLabel,
  getUpcomingSession,
  markConversationAsRead,
  resetUnreadCount,
  sendMessage,
  sessionDate,
  subscribeToMessages,
} from "@/services/chatService";
import { formatClock, formatDayLabel, toDate } from "@/services/member5/format";
import { markConversationNotificationsRead } from "@/services/member5/notificationService";
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
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    mimeType?: string;
  } | null>(null);
  const [imageMenuVisible, setImageMenuVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
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
        // Opening the chat clears my unread count and its message notifications.
        if ((conversation.unreadCounts?.[userId] ?? 0) > 0) resetUnreadCount(conversationId, userId);
        markConversationNotificationsRead(userId, conversationId);
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
    if ((!trimmed && !selectedImage) || sending || !conversationId || !userId) return;

    setSending(true);
    setSendError("");
    try {
      await sendMessage(conversationId, userId, trimmed, selectedImage ?? undefined);
      if (value === text) setText("");
      setSelectedImage(null);
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "Message or photo not sent. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleChooseFromGallery = async () => {
    setImageMenuVisible(false);
    setSendError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSendError("Allow LearnLink to access your photos to attach an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
      }
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Could not open your photo library.",
      );
    }
  };

  const handleTakePhoto = () => {
    setImageMenuVisible(false);
    setCameraVisible(true);
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
    const imageUri = message.imageBase64 || message.imageUrl;

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
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.messageImage}
              contentFit="cover"
            />
          ) : null}
          {message.text ? (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.messageTextRight : styles.messageTextLeft,
              ]}
            >
              {message.text}
            </Text>
          ) : null}
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

          {selectedImage ? (
            <View style={styles.selectedImageRow}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.selectedImage}
                contentFit="cover"
              />
              <Pressable
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove selected photo"
              >
                <Ionicons name="close-circle" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Pressable
              style={styles.attachButton}
              onPress={() => setImageMenuVisible(true)}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel="Attach a photo"
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </Pressable>
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
                ((!text.trim() && !selectedImage) || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={(!text.trim() && !selectedImage) || sending}
              accessibilityLabel="Send message"
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="send" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>

          <Modal
            visible={imageMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setImageMenuVisible(false)}
          >
            <View style={styles.imageMenuBackdrop}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setImageMenuVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close photo options"
              />
              <View style={styles.imageMenu}>
                <Text style={styles.imageMenuTitle}>Add a photo</Text>
                <Pressable style={styles.imageMenuOption} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={22} color={colors.primary} />
                  <Text style={styles.imageMenuOptionText}>Take Photo</Text>
                </Pressable>
                <Pressable
                  style={styles.imageMenuOption}
                  onPress={handleChooseFromGallery}
                >
                  <Ionicons name="images-outline" size={22} color={colors.primary} />
                  <Text style={styles.imageMenuOptionText}>Choose from Gallery</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <CameraModal
            visible={cameraVisible}
            onClose={() => setCameraVisible(false)}
            onPhotoCaptured={(uri) => {
              setSelectedImage({ uri, mimeType: "image/jpeg" });
              setCameraVisible(false);
            }}
          />
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
  messageImage: {
    width: 220,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.primarySoft,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  timestampText: { fontSize: 11, color: colors.textMuted },
  emptyChat: { padding: 32, alignItems: "center", transform: [{ scaleY: -1 }] },
  emptyChatText: { color: colors.textMuted, fontSize: 15 },
  sendError: { color: colors.error, paddingHorizontal: 16, paddingBottom: 4 },
  quickReplies: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  selectedImageRow: {
    alignSelf: "flex-start",
    marginHorizontal: 12,
    marginBottom: 8,
    position: "relative",
  },
  selectedImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "flex-end",
  },
  attachButton: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
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
  imageMenuBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "rgba(20, 20, 35, 0.35)",
  },
  imageMenu: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 6,
  },
  imageMenuTitle: {
    marginBottom: 4,
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  imageMenuOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  imageMenuOptionText: {
    fontSize: 15,
    fontWeight: "600",
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
