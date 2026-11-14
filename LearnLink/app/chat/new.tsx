import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, Button, Chip, EmptyState, ErrorState, LoadingState } from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useExchangeLabels } from "@/hooks/member5/useExchangeLabels";
import { useAuth } from "@/providers/AuthProvider";
import { getAcceptedExchanges, getOrCreateConversation } from "@/services/chatService";
import { errorMessage } from "@/services/member5/format";
import { displayNameOf, useUserProfiles } from "@/services/member5/userService";
import type { ExchangeRequest } from "@/types/member4/member4";

/** Start (or reopen) a chat for one of my accepted exchanges. */
export default function NewChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;
  const [exchanges, setExchanges] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      setExchanges(await getAcceptedExchanges(userId));
    } catch (err) {
      setError(errorMessage(err, "Could not load your exchanges."));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const partnerOf = (exchange: ExchangeRequest) =>
    exchange.senderId === userId ? exchange.receiverId : exchange.senderId;
  const profiles = useUserProfiles(exchanges.map(partnerOf));
  const labels = useExchangeLabels(exchanges.map((exchange) => exchange.id));

  const openChat = async (exchange: ExchangeRequest) => {
    if (!userId) return;
    setOpeningId(exchange.id);
    try {
      const partnerId = partnerOf(exchange);
      const conversationId = await getOrCreateConversation(exchange.id, [
        exchange.senderId,
        exchange.receiverId,
      ]);
      router.replace({
        pathname: "/chat/[conversationId]",
        params: {
          conversationId,
          otherUserId: partnerId,
          otherUserName: displayNameOf(profiles[partnerId]),
        },
      });
    } catch (err) {
      setError(errorMessage(err, "Could not open the chat."));
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error && exchanges.length === 0) return <ErrorState message={error} onRetry={load} />;
  if (exchanges.length === 0) {
    return (
      <EmptyState
        icon="chatbubbles-outline"
        title="No accepted exchanges yet"
        message="You can chat with a peer once they accept a skill exchange."
        action={
          <Button
            label="Propose a swap"
            icon="swap-horizontal"
            onPress={() => router.push("/member4/create-exchange-request")}
          />
        }
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={exchanges}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.hint}>Pick an accepted exchange to message your partner.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      renderItem={({ item }) => {
        const partnerId = partnerOf(item);
        const profile = profiles[partnerId];
        const name = displayNameOf(profile);
        const label = labels[item.id];
        return (
          <Pressable
            style={styles.row}
            onPress={() => openChat(item)}
            disabled={openingId !== null}
          >
            <Avatar uri={profile?.profilePhotoUrl} name={name} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{name}</Text>
              {label ? <Chip label={label} tone="mint" /> : null}
            </View>
            <Text style={styles.action}>{openingId === item.id ? "Opening…" : "Message"}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10 },
  hint: { color: colors.textSecondary, marginBottom: 8 },
  error: { color: colors.error, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  action: { color: colors.primary, fontWeight: "700" },
});
