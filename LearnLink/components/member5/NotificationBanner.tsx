import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import {
  markNotificationRead,
  notificationTarget,
  subscribeToNewNotifications,
} from "@/services/member5/notificationService";
import type { AppNotification } from "@/types/member5";

const VISIBLE_MS = 4000;

/**
 * In-app pop-up for notifications that arrive while the app is open. Mounted once in
 * app/_layout.tsx. Hidden on the Notifications screen; a chat message is not shown
 * while that chat is open (it's marked read instead). Only the newest one is shown.
 */
export function NotificationBanner() {
  const { user } = useAuth();
  const userId = user?.uid;
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setCurrent(null);
    if (!userId) return;
    return subscribeToNewNotifications(userId, (notification) => {
      const path = pathnameRef.current;
      if (path === "/notifications") return;
      if (notification.type === "NEW_MESSAGE" && path === `/chat/${notification.referenceId}`) {
        markNotificationRead(notification.notificationId).catch(() => undefined);
        return;
      }
      setCurrent(notification);
    });
  }, [userId]);

  useEffect(() => {
    if (!current) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setCurrent(null);
        },
      );
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current, opacity]);

  if (!current || !userId || pathname === "/notifications" || pathname.startsWith("/admin")) {
    return null;
  }

  const open = () => {
    const notification = current;
    setCurrent(null);
    opacity.setValue(0);
    markNotificationRead(notification.notificationId).catch(() => undefined);
    const target = notificationTarget(notification, userId);
    router.push(target?.href ?? "/notifications");
  };

  const close = () => {
    setCurrent(null);
    opacity.setValue(0);
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: insets.top + 8, opacity }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${current.title}. ${current.body}`}
        onPress={open}
        style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <Ionicons name="notifications" size={18} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {current.body}
          </Text>
        </View>
        <Pressable accessibilityLabel="Dismiss" accessibilityRole="button" hitSlop={10} onPress={close}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 12, right: 12, zIndex: 1000, elevation: 10 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#11112A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  body: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
});
