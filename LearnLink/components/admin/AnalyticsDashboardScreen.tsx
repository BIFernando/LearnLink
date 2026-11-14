import { useCallback, useEffect, useRef, useState } from "react";
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
import { useRouter } from "expo-router";

import {
  getAdminAnalyticsData,
  type AdminAnalyticsData,
  type AdminPopularityItem,
} from "../../services/adminAnalytics";

export function AnalyticsDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const metricWidth =
    width >= 820 ? "31.8%" : width >= 520 ? "48.5%" : "100%";
  const wideCharts = width >= 820;

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++requestId.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const data = await getAdminAnalyticsData();
      if (requestId.current === currentRequestId) {
        setAnalytics(data);
      }
    } catch (loadError) {
      console.error("Failed to load admin analytics:", loadError);
      if (requestId.current === currentRequestId) {
        setError(
          "Analytics could not be loaded. Check your connection and administrator access, then retry."
        );
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
    return () => {
      requestId.current += 1;
    };
  }, [loadAnalytics]);

  if (loading && !analytics) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3159A5" size="large" />
        <Text style={styles.centeredText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.centered}>
        <View style={styles.messageCard}>
          <Text style={styles.sectionTitle}>Analytics unavailable</Text>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error || "No analytics data is available."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadAnalytics()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const metrics = [
    {
      label: "Registered Users",
      value: analytics.totalUsers,
      detail: "User profile documents.",
      color: "#3159A5",
    },
    {
      label: "Active Users",
      value: analytics.activeUsers,
      detail: "Profiles with isActive set to true.",
      color: "#18836A",
    },
    {
      label: "Total Skill Exchanges",
      value: analytics.totalExchanges,
      detail: "All exchange request records.",
      color: "#C17B1A",
    },
    {
      label: "Completed Exchanges",
      value: analytics.completedExchanges,
      detail: "Requests with status COMPLETED.",
      color: "#4F7B3A",
    },
    {
      label: "Completed Sessions",
      value: analytics.completedSessions,
      detail: "Sessions with status COMPLETED.",
      color: "#7858B5",
    },
    {
      label: "Pending Reports",
      value: analytics.openReports,
      detail: "Reports with status OPEN.",
      color: "#B54862",
    },
    {
      label: "Resolved Reports",
      value: analytics.resolvedReports,
      detail: "Reports with status RESOLVED.",
      color: "#18836A",
    },
  ];

  const hasAnalyticsRecords =
    analytics.totalUsers > 0 ||
    analytics.totalExchanges > 0 ||
    analytics.completedExchanges > 0 ||
    analytics.completedSessions > 0 ||
    analytics.openReports > 0 ||
    analytics.resolvedReports > 0 ||
    analytics.userSkillRecordCount > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadAnalytics(true)}
          tintColor="#3159A5"
        />
      }
    >
      <View style={styles.page}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace("/admin")}
          style={styles.backLink}
        >
          <Text style={styles.backText}>‹  Admin dashboard</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>LEARNLINK / ADMIN</Text>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>
              Platform statistics from the current Firestore records.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={refreshing}
            onPress={() => void loadAnalytics(true)}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.buttonPressed,
              refreshing && styles.buttonMuted,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator color="#3159A5" />
            ) : (
              <Text style={styles.refreshText}>Refresh</Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text accessibilityRole="alert" style={styles.errorBannerText}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadAnalytics(true)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Platform overview</Text>
        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.metricCard,
                { borderLeftColor: metric.color, width: metricWidth },
              ]}
            >
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={[styles.metricValue, { color: metric.color }]}>
                {metric.value.toLocaleString()}
              </Text>
              <Text style={styles.metricDetail}>{metric.detail}</Text>
            </View>
          ))}
        </View>

        {!hasAnalyticsRecords ? (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No platform data yet</Text>
            <Text style={styles.bodyText}>
              Analytics will appear when user profiles, skill records,
              exchanges, or reports are available.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Most popular skills</Text>
        <View style={[styles.chartGrid, wideCharts && styles.chartGridWide]}>
          <PopularityChart
            title="Skills"
            subtitle="Member skill records grouped by skill name."
            entries={analytics.popularSkills}
            emptyMessage="No user skill records with a recognizable skill name."
          />
          <PopularityChart
            title="Categories"
            subtitle="Member skill records grouped by their category."
            entries={analytics.popularCategories}
            emptyMessage="No user skill records with a recognizable category."
          />
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.cardTitle}>Data availability</Text>
          <Text style={styles.bodyText}>
            User growth is not charted because the current app does not define
            a consistent users.createdAt timestamp for profile creation.
            Suspended users are not counted: isActive is not a suspension
            status. The completed-session metric reflects the Member 4
            workflow. The separate completed-exchange metric counts only
            request documents whose status is COMPLETED.
          </Text>
          <Text style={styles.noteCaption}>
            Skill popularity uses {analytics.userSkillRecordCount.toLocaleString()}{" "}
            userSkills documents; missing or unrecognized fields are excluded
            from the charts.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function PopularityChart({
  title,
  subtitle,
  entries,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  entries: AdminPopularityItem[];
  emptyMessage: string;
}) {
  const maximum = entries.reduce(
    (value, entry) => Math.max(value, entry.count),
    0
  );

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Popular {title.toLocaleLowerCase()}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyInline}>{emptyMessage}</Text>
      ) : (
        entries.map((entry) => (
          <View
            accessibilityLabel={`${entry.label}: ${entry.count} skill records`}
            key={entry.label.toLocaleLowerCase()}
            style={styles.chartRow}
          >
            <View style={styles.chartLabelRow}>
              <Text numberOfLines={1} style={styles.chartLabel}>
                {entry.label}
              </Text>
              <Text style={styles.chartCount}>
                {entry.count.toLocaleString()}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max((entry.count / maximum) * 100, 2)}%` },
                ]}
              />
            </View>
          </View>
        ))
      )}
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
    maxWidth: 1120,
    padding: 20,
    width: "100%",
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
  backLink: {
    alignSelf: "flex-start",
    marginBottom: 18,
    paddingVertical: 6,
  },
  backText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
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
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 80,
    paddingHorizontal: 12,
  },
  refreshText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonPressed: {
    backgroundColor: "#EEF3FB",
  },
  buttonMuted: {
    opacity: 0.65,
  },
  sectionTitle: {
    color: "#17243A",
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
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
    marginTop: 9,
  },
  metricDetail: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  chartGrid: {
    gap: 14,
    marginBottom: 20,
  },
  chartGridWide: {
    flexDirection: "row",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 18,
  },
  chartTitle: {
    color: "#24324A",
    fontSize: 16,
    fontWeight: "700",
  },
  chartSubtitle: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 4,
  },
  chartRow: {
    marginBottom: 13,
  },
  chartLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  chartLabel: {
    color: "#334155",
    flex: 1,
    fontSize: 13,
    marginRight: 12,
  },
  chartCount: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  barTrack: {
    backgroundColor: "#E9EEF7",
    borderRadius: 5,
    height: 9,
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: "#3159A5",
    borderRadius: 5,
    height: "100%",
  },
  emptyInline: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 10,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 26,
    padding: 18,
  },
  notesCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    padding: 18,
  },
  cardTitle: {
    color: "#24324A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 7,
  },
  bodyText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
  },
  noteCaption: {
    color: "#8793A5",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 10,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    padding: 12,
  },
  errorBannerText: {
    color: "#B42318",
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    marginRight: 10,
  },
  retryText: {
    color: "#3159A5",
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 46,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
