import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "@/config/firebase";
import { chatColors as colors } from "@/constants/chatColors";
import { useAuth } from "@/providers/AuthProvider";
import { subscribeToConversations } from "@/services/chatService";
import type { Conversation } from "@/types/chat.types";

interface ConversationWithUser extends Conversation {
  otherUser?: { displayName?: string; profilePhotoUrl?: string } | null;
}

async function getUserById(userId: string) {
  const snapshot = await getDoc(doc(db, "users", userId));
  return snapshot.exists() ? snapshot.data() : null;
}

function formatTime(timestamp: any) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToConversations(userId, async (convs) => {
      try {
        const enriched = await Promise.all(
          convs.map(async (conv) => {
            const otherUserId = conv.participantIds.find((id) => id !== userId);
            let otherUser = null;
            if (otherUserId) {
              try {
                otherUser = await getUserById(otherUserId);
              } catch (err) {
                console.error(`Failed to fetch user ${otherUserId}`, err);
              }
            }
            return { ...conv, otherUser } as ConversationWithUser;
          }),
        );
        setConversations(enriched);
      } catch {
        setError("Failed to load conversations.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const renderItem = ({ item }: { item: ConversationWithUser }) => {
    const displayName = item.otherUser?.displayName || "Unknown User";
    const profilePic =
      item.otherUser?.profilePhotoUrl || "https://via.placeholder.com/150";
    const otherUserId = item.participantIds.find((id) => id !== userId) || "";

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
        <Image source={{ uri: profilePic }} style={styles.avatar} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{displayName}</Text>
            <Text style={styles.chatTime}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations, partners or skills..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {conversations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No active conversations yet.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 24,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: colors.textPrimary },
  listContent: { paddingBottom: 20 },
  chatItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
  chatInfo: { flex: 1, justifyContent: "center" },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: { fontSize: 16, fontWeight: "bold", color: colors.textPrimary },
  chatTime: { fontSize: 12, color: colors.textMuted },
  lastMessage: { fontSize: 14, color: colors.textSecondary },
  errorText: { color: colors.error, fontSize: 16 },
  emptyText: { color: colors.textMuted, fontSize: 16 },
});
