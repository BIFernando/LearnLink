import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconBubble, type IoniconName } from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import { useUnreadNotificationCount } from "@/services/member5/notificationService";

const SHORTCUTS: { label: string; icon: IoniconName; href: Href }[] = [
  { label: "Notifications", icon: "notifications-outline", href: "/notifications" },
  { label: "Chats", icon: "chatbubbles-outline", href: "/chat" },
  { label: "XP & Progress", icon: "flash-outline", href: "/gamification" },
  { label: "Leaderboard", icon: "podium-outline", href: "/gamification/leaderboard" },
];

/**
 * Entry points to Member 5 screens until the tab shell (Member 6) links them directly.
 * Drop-in: <Member5Shortcuts /> on any screen.
 */
export function Member5Shortcuts() {
  const router = useRouter();
  const { user } = useAuth();
  const unread = useUnreadNotificationCount(user?.uid);

  return (
    <View style={styles.grid}>
      {SHORTCUTS.map((shortcut) => (
        <Pressable key={shortcut.label} style={styles.item} onPress={() => router.push(shortcut.href)}>
          <IconBubble icon={shortcut.icon} size={36} />
          <Text style={styles.label}>{shortcut.label}</Text>
          {shortcut.href === "/notifications" && unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  item: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  label: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
});
