import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";

import { auth } from "../../../config/firebase";
import {
  getAdminDashboardData,
  type AdminDashboardData,
  type RecentExchangeActivity,
} from "../../../services/adminDashboard";

type DashboardSection = {
  title: string;
  description: string;
  route: string;
};

const sections: DashboardSection[] = [
  {
    title: "User Management",
    description: "Review and manage member accounts",
    route: "users",
  },
  {
    title: "Skill Management",
    description: "Manage the shared skills catalog",
    route: "skills",
  },
  {
    title: "Reports",
    description: "Review user-reported content",
    route: "reports",
  },
  {
    title: "Analytics",
    description: "Explore platform usage insights",
    route: "analytics",
  },
];

export default function AdminHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const wide = width >= 760;
  const threeColumns = width >= 760;

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getAdminDashboardData();
      setDashboard(data);
    } catch (loadError) {
      console.error("Failed to load admin dashboard:", loadError);
      setError(
        "Dashboard data could not be loaded. Check your connection and admin access, then try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    setLogoutLoading(true);
    setLogoutError("");

    try {
      await signOut(auth);
      router.replace("/admin/login");
    } catch (logoutFailure) {
      console.error("Failed to sign out from admin dashboard:", logoutFailure);
      setLogoutError("Could not sign out. Please try again.");
    } finally {
      setLogoutLoading(false);
    }
  }

  function openSection(route: string) {
    if (route === "users") {
      router.push("/admin/users");
      return;
    }

    router.push({
      pathname: "/admin/[section]",
      params: { section: route },
    });
  }

  const welcomeName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "Administrator";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3159A5" size="large" />
        <Text style={styles.centeredText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.centered}>
        <View style={styles.messageCard}>
          <Text style={styles.sectionTitle}>Dashboard unavailable</Text>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error || "No dashboard data is available."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadDashboard()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const metrics = [
    { label: "Total Users", value: dashboard.totalUsers, color: "#3159A5" },
    { label: "Active Users", value: dashboard.activeUsers, color: "#18836A" },
    {
      label: "Suspended Users",
      value: null,
      detail: "No suspension field is defined in the user schema.",
      color: "#C45B42",
    },
    {
      label: "Total Skills",
      value: dashboard.totalSkills,
      detail: "Entries in the skills catalog.",
      color: "#7858B5",
    },
    {
      label: "Total Exchanges",
      value: dashboard.totalExchanges,
      detail: "Exchange requests.",
      color: "#C17B1A",
    },
    {
      label: "Pending Reports",
      value: null,
      detail: "Report status and pending-state schema are not defined.",
      color: "#B54862",
    },
  ];

  const hasDashboardRecords =
    dashboard.totalUsers > 0 ||
    dashboard.totalSkills > 0 ||
    dashboard.totalExchanges > 0 ||
    dashboard.recentActivities.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadDashboard(true)}
          tintColor="#3159A5"
        />
      }
    >
      <View style={[styles.page, wide && styles.pageWide]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>LEARNLINK / ADMIN</Text>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.welcome}>Welcome back, {welcomeName}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={logoutLoading}
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              (pressed || logoutLoading) && styles.buttonMuted,
            ]}
          >
            {logoutLoading ? (
              <ActivityIndicator color="#3159A5" />
            ) : (
              <Text style={styles.logoutText}>Log out</Text>
            )}
          </Pressable>
        </View>

        {logoutError ? (
          <Text accessibilityRole="alert" style={styles.logoutError}>
            {logoutError}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Platform overview</Text>
        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.metricCard,
                {
                  borderLeftColor: metric.color,
                  width: threeColumns ? "31.6%" : "48.2%",
                },
              ]}
            >
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={[styles.metricValue, { color: metric.color }]}>
                {metric.value === null ? "—" : metric.value.toLocaleString()}
              </Text>
              {metric.detail ? (
                <Text style={styles.metricDetail}>{metric.detail}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {!hasDashboardRecords ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No platform data yet</Text>
            <Text style={styles.bodyText}>
              User, skill, and exchange counts are all zero. New activity will
              appear here when records are created.
            </Text>
          </View>
        ) : null}

        <View style={styles.contentGrid}>
          <View
            style={[
              styles.panel,
              wide ? styles.panelWide : styles.panelFull,
            ]}
          >
            <View style={styles.panelHeading}>
              <View>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
                <Text style={styles.panelSubtitle}>
                  Latest exchange requests
                </Text>
              </View>
            </View>
            {dashboard.recentActivities.length ? (
              dashboard.recentActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))
            ) : (
              <Text style={styles.emptyInline}>
                No exchange activity found.
              </Text>
            )}
          </View>

          <View
            style={[
              styles.panel,
              wide ? styles.panelNarrow : styles.panelFull,
            ]}
          >
            <Text style={styles.sectionTitle}>Management</Text>
            <Text style={styles.panelSubtitle}>
              Review accounts and explore available admin sections.
            </Text>
            <View style={styles.sectionLinks}>
              {sections.map((section) => (
                <Pressable
                  accessibilityRole="link"
                  key={section.route}
                  onPress={() => openSection(section.route)}
                  style={({ pressed }) => [
                    styles.sectionLink,
                    pressed && styles.sectionLinkPressed,
                  ]}
                >
                  <View style={styles.sectionLinkCopy}>
                    <Text style={styles.sectionLinkTitle}>
                      {section.title}
                    </Text>
                    <Text style={styles.sectionLinkDescription}>
                      {section.description}
                    </Text>
                  </View>
                  <Text style={styles.sectionLinkArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function ActivityRow({ activity }: { activity: RecentExchangeActivity }) {
  const dateLabel = activity.createdAt
    ? activity.createdAt.toLocaleString()
    : "Date unavailable";

  return (
    <View style={styles.activityRow}>
      <View style={styles.activityMarker} />
      <View style={styles.activityCopy}>
        <Text style={styles.activityTitle}>
          Exchange request · {activity.status}
        </Text>
        <Text numberOfLines={1} style={styles.activityDetail}>
          {activity.senderId} → {activity.receiverId}
        </Text>
        <Text style={styles.activityDate}>{dateLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    backgroundColor: "#F3F6FB",
    flexGrow: 1,
  },
  page: {
    alignSelf: "center",
    maxWidth: 1180,
    padding: 20,
    width: "100%",
  },
  pageWide: {
    paddingHorizontal: 36,
    paddingTop: 32,
  },
  centered: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  centeredText: {
    color: "#64748B",
    fontSize: 15,
    marginTop: 14,
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 440,
    padding: 24,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerCopy: {
    flexShrink: 1,
    paddingRight: 12,
  },
  brand: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    color: "#17243A",
    fontSize: 30,
    fontWeight: "700",
  },
  welcome: {
    color: "#64748B",
    fontSize: 15,
    marginTop: 6,
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: 14,
  },
  buttonMuted: {
    opacity: 0.65,
  },
  logoutText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "700",
  },
  logoutError: {
    color: "#B42318",
    fontSize: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#17243A",
    fontSize: 19,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
    marginTop: 14,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderRadius: 13,
    borderWidth: 1,
    minHeight: 116,
    padding: 16,
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 27,
    fontWeight: "700",
    marginTop: 10,
  },
  metricDetail: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  contentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  panelWide: {
    flex: 1,
    minWidth: 330,
  },
  panelNarrow: {
    width: 340,
  },
  panelFull: {
    width: "100%",
  },
  panelHeading: {
    marginBottom: 4,
  },
  panelSubtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    marginTop: 5,
  },
  activityRow: {
    alignItems: "flex-start",
    borderTopColor: "#EDF1F6",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingVertical: 14,
  },
  activityMarker: {
    backgroundColor: "#3159A5",
    borderRadius: 5,
    height: 9,
    marginRight: 12,
    marginTop: 5,
    width: 9,
  },
  activityCopy: {
    flex: 1,
  },
  activityTitle: {
    color: "#24324A",
    fontSize: 14,
    fontWeight: "600",
  },
  activityDetail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 5,
  },
  activityDate: {
    color: "#8793A5",
    fontSize: 11,
    marginTop: 5,
  },
  emptyInline: {
    borderTopColor: "#EDF1F6",
    borderTopWidth: 1,
    color: "#64748B",
    fontSize: 14,
    paddingTop: 16,
  },
  sectionLinks: {
    gap: 8,
  },
  sectionLink: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E6EBF2",
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  sectionLinkPressed: {
    backgroundColor: "#EEF3FB",
  },
  sectionLinkCopy: {
    flex: 1,
  },
  sectionLinkTitle: {
    color: "#24324A",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionLinkDescription: {
    color: "#718096",
    fontSize: 11,
    marginTop: 4,
  },
  sectionLinkArrow: {
    color: "#3159A5",
    fontSize: 24,
    marginLeft: 10,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 26,
    padding: 18,
  },
  emptyTitle: {
    color: "#24324A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
  },
  bodyText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    minHeight: 46,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
