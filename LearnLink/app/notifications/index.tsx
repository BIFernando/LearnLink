import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconBubble,
  LoadingState,
  type IoniconName,
} from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import { errorMessage, formatTimeAgo } from "@/services/member5/format";
import {
  ACHIEVEMENT_NOTIFICATION_TYPES,
  SESSION_NOTIFICATION_TYPES,
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
  notificationTarget,
  subscribeToNotifications,
} from "@/services/member5/notificationService";
import type { AppNotification, NotificationType } from "@/types/member5";

type Filter = "ALL" | "UNREAD" | "SESSIONS" | "ACHIEVEMENTS";

const TYPE_STYLE: Record<NotificationType, { icon: IoniconName; bg: string; fg: string }> = {
  NEW_MESSAGE: { icon: "chatbubble-ellipses", bg: colors.primarySoft, fg: colors.primary },
  NEW_MATCH: { icon: "people", bg: colors.mintSoft, fg: colors.teal },
  EXCHANGE_REQUEST: { icon: "swap-horizontal", bg: colors.mintSoft, fg: colors.teal },
  REQUEST_ACCEPTED: { icon: "checkmark-circle", bg: colors.mintSoft, fg: colors.teal },
  REQUEST_REJECTED: { icon: "close-circle", bg: colors.errorSoft, fg: colors.error },
  SESSION_REMINDER: { icon: "calendar", bg: colors.mintSoft, fg: colors.teal },
  SESSION_COMPLETED: { icon: "star", bg: colors.primarySoft, fg: colors.primary },
  NEW_REVIEW: { icon: "chatbox-ellipses", bg: colors.primarySoft, fg: colors.primary },
  BADGE_EARNED: { icon: "ribbon", bg: colors.peach, fg: colors.amber },
  LEVEL_UP: { icon: "flash", bg: colors.peach, fg: colors.amber },
};

const DISMISSIBLE: NotificationType[] = ["SESSION_COMPLETED", "NEW_MATCH", "LEVEL_UP", "BADGE_EARNED"];

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    return subscribeToNotifications(
      userId,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        setError(errorMessage(err, "Failed to load notifications."));
        setLoading(false);
      },
    );
  }, [userId, retryKey]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const visible = useMemo(
    () =>
      notifications.filter((item) => {
        if (filter === "UNREAD") return !item.isRead;
        if (filter === "SESSIONS") return SESSION_NOTIFICATION_TYPES.includes(item.type);
        if (filter === "ACHIEVEMENTS") return ACHIEVEMENT_NOTIFICATION_TYPES.includes(item.type);
        return true;
      }),
    [notifications, filter],
  );

  const run = async (action: () => Promise<void>, failure: string) => {
    setActionError("");
    try {
      await action();
    } catch (err) {
      setActionError(errorMessage(err, failure));
    }
  };

  const open = (item: AppNotification) => {
    if (!userId) return;
    if (!item.isRead) {
      run(() => markNotificationRead(item.notificationId), "Could not mark as read.");
    }
    const target = notificationTarget(item, userId);
    if (target) router.push(target.href);
  };

  if (loading) return <LoadingState />;
  if (!userId) return <EmptyState icon="lock-closed-outline" title="Sign in to see notifications" />;
  if (error) return <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />;

  const filters: { key: Filter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "UNREAD", label: unreadCount > 0 ? `Unread ${unreadCount}` : "Unread" },
    { key: "SESSIONS", label: "Sessions" },
    { key: "ACHIEVEMENTS", label: "Achievements" },
  ];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visible}
      keyExtractor={(item) => item.notificationId}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={styles.newPill}>
                  <Text style={styles.newPillText}>{unreadCount} New</Text>
                </View>
              ) : null}
            </View>
            {unreadCount > 0 ? (
              <Pressable
                hitSlop={8}
                onPress={() => run(() => markAllNotificationsRead(notifications), "Could not mark all as read.")}
              >
                <Text style={styles.markAll}>✓✓ Mark all read</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filters.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                tone="primary"
                selected={filter === option.key}
                onPress={() => setFilter(option.key)}
              />
            ))}
          </ScrollView>
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <IconBubble icon="notifications-off-outline" size={56} />
          <Text style={styles.emptyTitle}>
            {notifications.length === 0 ? "You're all caught up" : "Nothing here"}
          </Text>
          <Text style={styles.emptyText}>
            {notifications.length === 0
              ? "Messages, sessions, reviews and achievements will show up here."
              : "No notifications match this filter."}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const style = TYPE_STYLE[item.type] ?? TYPE_STYLE.NEW_MESSAGE;
        const target = userId ? notificationTarget(item, userId) : null;
        return (
          <Pressable
            onPress={() => open(item)}
            style={[styles.card, !item.isRead && styles.cardUnread]}
            accessibilityRole="button"
          >
            <IconBubble icon={style.icon} bg={style.bg} fg={style.fg} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                  {!item.isRead ? <Text style={{ color: colors.primary }}> •</Text> : null}
                </Text>
                <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <View style={styles.actions}>
                {target ? (
                  <Button
                    label={target.label}
                    variant={item.type === "SESSION_REMINDER" ? "teal" : "primary"}
                    onPress={() => open(item)}
                    style={styles.actionButton}
                  />
                ) : null}
                {DISMISSIBLE.includes(item.type) ? (
                  <Button
                    label="Dismiss"
                    variant="ghost"
                    onPress={() => run(() => dismissNotification(item.notificationId), "Could not dismiss.")}
                    style={styles.actionButton}
                  />
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  newPill: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  newPillText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  markAll: { color: colors.primary, fontWeight: "600" },
  error: { color: colors.error },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  cardUnread: { backgroundColor: "#F0F0FF" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textMuted },
  body: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionButton: { paddingVertical: 8, paddingHorizontal: 14 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptyText: { color: colors.textSecondary, textAlign: "center" },
});
