import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconBubble,
  LoadingState,
} from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useExchangeLabels } from "@/hooks/member5/useExchangeLabels";
import { useAuth } from "@/providers/AuthProvider";
import {
  markAllConversationsAsRead,
  subscribeToConversations,
} from "@/services/chatService";
import { formatListTime } from "@/services/member5/format";
import { displayNameOf, useUserProfiles } from "@/services/member5/userService";
import type { Conversation } from "@/types/chat.types";

type Filter = "ALL" | "UNREAD";

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [markingAll, setMarkingAll] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    return subscribeToConversations(
      userId,
      (convs) => {
        setConversations(convs);
        setLoading(false);
      },
      () => {
        setError("Failed to load conversations.");
        setLoading(false);
      },
    );
  }, [userId, retryKey]);

  const otherIdOf = (conv: Conversation) =>
    conv.participantIds.find((id) => id !== userId) ?? "";
  const profiles = useUserProfiles(conversations.map(otherIdOf));
  const exchangeLabels = useExchangeLabels(conversations.map((conv) => conv.exchangeRequestId));
  const unreadOf = (conv: Conversation) => (userId ? conv.unreadCounts?.[userId] ?? 0 : 0);
  const unreadChats = conversations.filter((conv) => unreadOf(conv) > 0).length;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter((conv) => {
      const unread = userId ? conv.unreadCounts?.[userId] ?? 0 : 0;
      if (filter === "UNREAD" && unread === 0) return false;
      if (!term) return true;
      const otherId = conv.participantIds.find((id) => id !== userId) ?? "";
      const haystack = [
        displayNameOf(profiles[otherId]),
        conv.lastMessage,
        exchangeLabels[conv.exchangeRequestId] ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [conversations, filter, search, profiles, exchangeLabels, userId]);

  const handleMarkAllRead = async () => {
    if (!userId || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllConversationsAsRead(conversations, userId);
    } catch {
      setError("Could not mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const otherUserId = otherIdOf(item);
    const profile = profiles[otherUserId];
    const displayName = displayNameOf(profile);
    const unread = unreadOf(item);
    const swapLabel = exchangeLabels[item.exchangeRequestId];

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          router.push({
            pathname: "/chat/[conversationId]",
            params: {
              conversationId: item.conversationId,
              otherUserId,
              otherUserName: displayName,
            },
          })
        }
      >
        <Avatar uri={profile?.profilePhotoUrl} name={displayName} size={52} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.chatTime, unread > 0 && styles.chatTimeUnread]}>
              {formatListTime(item.lastMessageAt)}
            </Text>
          </View>
          {swapLabel ? (
            <View style={styles.swapChip}>
              <Chip label={swapLabel} tone="mint" icon="swap-horizontal" />
            </View>
          ) : null}
          <View style={styles.previewRow}>
            <Text
              style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.lastMessage || "No messages yet. Say hi!"}
            </Text>
            {unread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <Stack.Screen
      options={{
        title: "Chats",
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/notifications")}
            hitSlop={8}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          </Pressable>
        ),
      }}
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <LoadingState />
      </>
    );
  }

  if (!userId) {
    return (
      <>
        {header}
        <EmptyState icon="lock-closed-outline" title="Sign in to see your chats" />
      </>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <>
        {header}
        <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />
      </>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.conversationId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>Chats</Text>
                <Text style={styles.subtitle}>
                  {conversations.length} active peer exchange{conversations.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Button label="New" icon="create-outline" onPress={() => router.push("/chat/new")} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations, partners or skills..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <View style={styles.chips}>
              <Chip label="All" selected={filter === "ALL"} tone="neutral" onPress={() => setFilter("ALL")} />
              <Chip
                label={unreadChats > 0 ? `Unread ${unreadChats}` : "Unread"}
                selected={filter === "UNREAD"}
                tone="neutral"
                onPress={() => setFilter("UNREAD")}
              />
            </View>

            {error ? <Text style={styles.inlineError}>{error}</Text> : null}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>RECENT MESSAGES</Text>
              {unreadChats > 0 ? (
                <Pressable onPress={handleMarkAllRead} disabled={markingAll} hitSlop={8}>
                  <Text style={styles.markAll}>{markingAll ? "Marking…" : "✓✓ Mark all read"}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {conversations.length === 0
                ? "No active conversations yet."
                : "No conversations match your search."}
            </Text>
          </View>
        }
        ListFooterComponent={
          <Pressable
            style={styles.proposeCard}
            onPress={() => router.push("/member4/create-exchange-request")}
          >
            <IconBubble icon="swap-horizontal" bg={colors.primary} fg={colors.white} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proposeTitle}>Propose a Peer Swap</Text>
              <Text style={styles.proposeText}>Exchange 1h of your skill to earn study credits</Text>
            </View>
            <Text style={styles.proposeAction}>Propose</Text>
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    borderRadius: 24,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.textPrimary,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  inlineError: {
    color: colors.error,
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  markAll: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  chatItem: {
    flexDirection: "row",
    padding: 14,
    marginBottom: 1,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
    gap: 14,
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chatTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: "700",
  },
  swapChip: {
    marginVertical: 2,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  lastMessageUnread: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  proposeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  proposeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  proposeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  proposeAction: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
});
