import { Ionicons } from "@expo/vector-icons";
import {
  Stack,
  usePathname,
  useRouter,
  type Href,
} from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, type IoniconName } from "@/components/member5/ui";
import { m5Colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";

const routes = {
  home: "/" as Href,
  discover: "/explore" as Href,
  matches: "/matches" as Href,
  messages: "/chat" as Href,
  profile: "/my-skills" as Href,
  exchanges: "/member4/exchange-requests" as Href,
  sessions: "/member4/sessions" as Href,
  wallet: "/member4/credit-wallet" as Href,
  selectExchangeForSession: "/member4/select-exchange-for-session" as Href,
  notifications: "/notifications" as Href,
  progress: "/gamification" as Href,
  leaderboard: "/gamification/leaderboard" as Href,
};

type Destination = "home" | "discover" | "matches" | "messages" | "profile";

const bottomDestinations: {
  key: Destination;
  label: string;
  icon: IoniconName;
  href: Href;
}[] = [
  { key: "home", label: "Home", icon: "home-outline", href: routes.home },
  { key: "discover", label: "Discover", icon: "compass-outline", href: routes.discover },
  { key: "matches", label: "Matches", icon: "people-outline", href: routes.matches },
  { key: "messages", label: "Chat", icon: "chatbubbles-outline", href: routes.messages },
  { key: "profile", label: "Profile", icon: "person-outline", href: routes.profile },
];

const drawerDestinations: {
  label: string;
  icon: IoniconName;
  href: Href;
}[] = [
  { label: "Notifications", icon: "notifications-outline", href: routes.notifications },
  { label: "Exchanges", icon: "swap-horizontal-outline", href: routes.exchanges },
  { label: "Sessions", icon: "calendar-outline", href: routes.sessions },
  { label: "Credit wallet", icon: "wallet-outline", href: routes.wallet },
  { label: "XP & Progress", icon: "flash-outline", href: routes.progress },
  { label: "Leaderboard", icon: "podium-outline", href: routes.leaderboard },
];

function getActiveDestination(pathname: string): Destination | null {
  if (pathname === "/" || pathname === "/(tabs)") {
    return "home";
  }

  if (
    pathname === "/explore" ||
    pathname === "/(tabs)/explore" ||
    pathname.startsWith("/students/")
  ) {
    return "discover";
  }

  if (
    pathname === "/matches" ||
    pathname.startsWith("/member3/")
  ) {
    return "matches";
  }

  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    return "messages";
  }

  if (
    pathname === "/my-skills" ||
    pathname.startsWith("/skills/")
  ) {
    return "profile";
  }

  return null;
}

function isPrimaryRoute(pathname: string): boolean {
  return [
    "/",
    "/(tabs)",
    "/explore",
    "/(tabs)/explore",
    "/my-skills",
    "/matches",
    "/chat",
    "/member4/exchange-requests",
    "/member4/my-exchanges",
    "/member4/sessions",
    "/member4/credit-wallet",
    "/notifications",
    "/gamification",
    "/gamification/leaderboard",
  ].includes(pathname);
}

export function LearnLinkNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, studentProfile } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const showChrome = !pathname.startsWith("/admin") && pathname !== "/modal";
  const activeDestination = getActiveDestination(pathname);
  const showBackButton =
    showChrome && !isPrimaryRoute(pathname) && router.canGoBack();
  const showScheduleButton =
    showChrome &&
    [
      "/",
      "/matches",
      "/member4/exchange-requests",
      "/member4/sessions",
      "/member4/credit-wallet",
    ].includes(pathname);

  function navigate(href: Href) {
    setDrawerVisible(false);
    router.navigate(href);
  }

  return (
    <View style={styles.root}>
      <View style={styles.navigator}>
        <Stack
          screenOptions={{
            headerShown: showChrome,
            headerStyle: { backgroundColor: m5Colors.card },
            headerShadowVisible: false,
            headerTitle: () => <Text style={styles.headerTitle}>LearnLink</Text>,
            headerLeft: () => (
              <View style={styles.headerLeft}>
                {showBackButton ? (
                  <Pressable
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => router.back()}
                    style={styles.headerButton}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={22}
                      color={m5Colors.textPrimary}
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Open navigation menu"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setDrawerVisible(true)}
                  style={styles.headerButton}
                >
                  <Ionicons
                    name="menu"
                    size={24}
                    color={m5Colors.textPrimary}
                  />
                </Pressable>
              </View>
            ),
            headerRight: () => (
              <View style={styles.headerRight}>
                <Pressable
                  accessibilityLabel="Notifications"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => navigate(routes.notifications)}
                  style={styles.headerButton}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color={m5Colors.textPrimary}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel="Messages"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => navigate(routes.messages)}
                  style={styles.headerButton}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={21}
                    color={m5Colors.textPrimary}
                  />
                </Pressable>
              </View>
            ),
            contentStyle: { backgroundColor: m5Colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: showChrome }} />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Modal",
              headerLeft: () => null,
              headerRight: () => null,
            }}
          />
          <Stack.Screen name="member4" options={{ headerShown: showChrome }} />
          <Stack.Screen name="chat" options={{ headerShown: showChrome }} />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: showChrome }}
          />
          <Stack.Screen name="reviews" options={{ headerShown: showChrome }} />
          <Stack.Screen
            name="gamification"
            options={{ headerShown: showChrome }}
          />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>

        {showScheduleButton ? (
          <Pressable
            accessibilityLabel="Schedule Session"
            accessibilityRole="button"
            onPress={() => router.push(routes.selectExchangeForSession)}
            style={({ pressed }) => [
              styles.scheduleButton,
              pressed && styles.scheduleButtonPressed,
            ]}
          >
            <Ionicons name="add" size={23} color={m5Colors.white} />
            <Text style={styles.scheduleButtonText}>Schedule</Text>
          </Pressable>
        ) : null}
      </View>

      {showChrome ? (
        <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea}>
          <View style={styles.bottomBar}>
            {bottomDestinations.map((destination) => {
              const isActive = activeDestination === destination.key;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  key={destination.key}
                  onPress={() => navigate(destination.href)}
                  style={styles.bottomItem}
                >
                  <Ionicons
                    name={destination.icon}
                    size={22}
                    color={
                      isActive ? m5Colors.primary : m5Colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.bottomLabel,
                      isActive && styles.bottomLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {destination.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}
        transparent
        visible={drawerVisible && showChrome}
      >
        <View style={styles.drawerOverlay}>
          <Pressable
            accessibilityLabel="Close navigation menu"
            accessibilityRole="button"
            onPress={() => setDrawerVisible(false)}
            style={styles.drawerBackdrop}
          />
          <SafeAreaView
            edges={["top", "bottom"]}
            style={styles.drawerPanel}
          >
            <View style={styles.drawerHeader}>
              <Avatar
                name={
                  studentProfile?.displayName ??
                  user?.displayName ??
                  "LearnLink Student"
                }
                size={52}
                uri={studentProfile?.profilePhotoUrl}
              />
              <View style={styles.studentDetails}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {studentProfile?.displayName ??
                    user?.displayName ??
                    "LearnLink Student"}
                </Text>
                <Text style={styles.studentInfo} numberOfLines={2}>
                  {studentProfile?.location ??
                    user?.email ??
                    "Skill exchange community"}
                </Text>
              </View>
            </View>

            <Text style={styles.drawerSectionTitle}>Your community</Text>
            <ScrollView
              contentContainerStyle={styles.drawerItems}
              showsVerticalScrollIndicator={false}
            >
              {drawerDestinations.map((destination) => (
                <Pressable
                  accessibilityRole="button"
                  key={destination.label}
                  onPress={() => navigate(destination.href)}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    pressed && styles.drawerItemPressed,
                  ]}
                >
                  <Ionicons
                    name={destination.icon}
                    size={21}
                    color={m5Colors.primary}
                  />
                  <Text style={styles.drawerItemText}>
                    {destination.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={m5Colors.textMuted}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: m5Colors.background,
    flex: 1,
  },
  navigator: {
    flex: 1,
  },
  headerTitle: {
    color: m5Colors.primary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  headerRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    minWidth: 40,
  },
  scheduleButton: {
    alignItems: "center",
    backgroundColor: m5Colors.primary,
    borderRadius: 28,
    bottom: 16,
    elevation: 5,
    flexDirection: "row",
    gap: 6,
    minHeight: 52,
    paddingHorizontal: 17,
    position: "absolute",
    right: 16,
    shadowColor: "#11112A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  scheduleButtonPressed: {
    opacity: 0.85,
  },
  scheduleButtonText: {
    color: m5Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  bottomSafeArea: {
    backgroundColor: m5Colors.card,
    borderTopColor: m5Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomBar: {
    alignItems: "center",
    backgroundColor: m5Colors.card,
    flexDirection: "row",
    height: 62,
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  bottomItem: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 54,
  },
  bottomLabel: {
    color: m5Colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  bottomLabelActive: {
    color: m5Colors.primary,
    fontWeight: "800",
  },
  drawerOverlay: {
    backgroundColor: "rgba(16, 20, 40, 0.42)",
    flex: 1,
    flexDirection: "row",
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerPanel: {
    backgroundColor: m5Colors.card,
    borderBottomRightRadius: 20,
    borderTopRightRadius: 20,
    maxWidth: 360,
    paddingHorizontal: 20,
    width: "84%",
  },
  drawerHeader: {
    alignItems: "center",
    borderBottomColor: m5Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingBottom: 22,
    paddingTop: 16,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    color: m5Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  studentInfo: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  drawerSectionTitle: {
    color: m5Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 22,
    textTransform: "uppercase",
  },
  drawerItems: {
    gap: 5,
    paddingTop: 10,
  },
  drawerItem: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 14,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  drawerItemPressed: {
    backgroundColor: m5Colors.primarySoft,
  },
  drawerItemText: {
    color: m5Colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
});
