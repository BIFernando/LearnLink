import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import {
  getAdminReportsPage,
} from "../../services/adminReports";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  type ReportFilter,
  type ReportRecord,
} from "../../types/reports";

const FILTERS: ReportFilter[] = ["ALL", ...REPORT_STATUSES];

function formatDate(value: Date | undefined): string {
  return value ? value.toLocaleString() : "Date unavailable";
}

export function ReportsManagementScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ReportFilter>("ALL");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [cursor, setCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      const currentRequestId = ++requestId.current;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadingMore(false);
      setError("");

      try {
        const page = await getAdminReportsPage(filter, null);
        if (requestId.current !== currentRequestId) {
          return;
        }
        setReports(page.reports);
        setCursor(page.lastDocument);
        setHasMore(page.hasMore);
      } catch (loadError) {
        console.error("Failed to load admin reports:", loadError);
        if (requestId.current === currentRequestId) {
          setError(
            "Reports could not be loaded. Check your connection and administrator access, then retry."
          );
        }
      } finally {
        if (requestId.current === currentRequestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filter]
  );

  useEffect(() => {
    void loadFirstPage();
    return () => {
      requestId.current += 1;
    };
  }, [loadFirstPage]);

  async function loadMore() {
    if (!hasMore || loadingMore || !cursor) {
      return;
    }

    const currentRequestId = requestId.current;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getAdminReportsPage(filter, cursor);
      if (requestId.current !== currentRequestId) {
        return;
      }
      setReports((current) => [...current, ...page.reports]);
      setCursor(page.lastDocument);
      setHasMore(page.hasMore);
    } catch (loadError) {
      console.error("Failed to load more admin reports:", loadError);
      if (requestId.current === currentRequestId) {
        setError("More reports could not be loaded. Please retry.");
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoadingMore(false);
      }
    }
  }

  function openReport(reportId: string) {
    router.push({
      pathname: "/admin/reports/[reportId]",
      params: { reportId },
    });
  }

  function renderReport({ item }: { item: ReportRecord }) {
    const targetLabel =
      item.targetType?.replaceAll("_", " ") ?? "Unrecognized target";
    const reasonLabel = REPORT_REASONS.find(
      (reason) => reason.value === item.reason
    )?.label;
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openReport(item.id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{targetLabel}</Text>
          <Text style={styles.status}>{item.status ?? "Unknown status"}</Text>
        </View>
        <Text style={styles.detail}>
          Reason: {reasonLabel ?? item.reason ?? "Unavailable"}
        </Text>
        <Text style={styles.detail}>
          Reporter: {item.reporterId ?? "Unavailable"}
        </Text>
        <Text style={styles.detail}>
          Target ID: {item.targetId ?? "Unavailable"}
        </Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        {!item.recognized ? (
          <Text style={styles.legacy}>
            Unrecognized or legacy report - read-only
          </Text>
        ) : null}
      </Pressable>
    );
  }

  function renderFooter() {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color="#3159A5" />
        </View>
      );
    }
    if (!hasMore) {
      return reports.length ? (
        <Text style={styles.endText}>You have reached the end of the reports.</Text>
      ) : null;
    }
    return (
      <Pressable onPress={() => void loadMore()} style={styles.loadMore}>
        <Text style={styles.loadMoreText}>Load more</Text>
      </Pressable>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={reports}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        loading ? (
          <View style={styles.loadingEmpty}>
            <ActivityIndicator color="#3159A5" />
            <Text style={styles.detail}>Loading reports...</Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No reports found</Text>
            <Text style={styles.detail}>
              {filter === "ALL"
                ? "No report documents are available."
                : `No reports marked ${filter} were found.`}
            </Text>
          </View>
        )
      }
      ListFooterComponent={renderFooter}
      ListHeaderComponent={
        <View>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/admin")}
            style={styles.backLink}
          >
            <Text style={styles.backText}>‹  Admin dashboard</Text>
          </Pressable>
          <Text style={styles.eyebrow}>LEARNLINK / ADMIN</Text>
          <Text style={styles.title}>Reports Management</Text>
          <Text style={styles.subtitle}>
            Review submitted reports. Unrecognized or legacy documents are
            available for inspection but cannot be moderated.
          </Text>
          <View style={styles.filters}>
            {FILTERS.map((value) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === value }}
                key={value}
                onPress={() => setFilter(value)}
                style={[
                  styles.filter,
                  filter === value && styles.filterSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === value && styles.filterTextSelected,
                  ]}
                >
                  {value === "ALL" ? "All" : value}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? (
            <View style={styles.errorBanner}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {error}
              </Text>
              <Pressable onPress={() => void loadFirstPage(true)}>
                <Text style={styles.retry}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      }
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          onRefresh={() => void loadFirstPage(true)}
          refreshing={refreshing}
          tintColor="#3159A5"
        />
      }
      renderItem={renderReport}
      ListHeaderComponentStyle={styles.listHeader}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: "#F3F6FB",
    flex: 1,
  },
  content: {
    alignSelf: "center",
    maxWidth: 980,
    padding: 20,
    paddingBottom: 40,
    width: "100%",
  },
  listHeader: {
    marginBottom: 12,
  },
  backLink: {
    alignSelf: "flex-start",
    marginBottom: 14,
    paddingVertical: 5,
  },
  backText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
  },
  eyebrow: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: {
    color: "#17243A",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 6,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  filter: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterSelected: {
    backgroundColor: "#E7EEFA",
    borderColor: "#3159A5",
  },
  filterText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextSelected: {
    color: "#3159A5",
  },
  errorBanner: {
    backgroundColor: "#FFF4F2",
    borderRadius: 10,
    marginTop: 14,
    padding: 12,
  },
  errorText: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
  },
  retry: {
    color: "#3159A5",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 10,
    padding: 15,
  },
  cardPressed: {
    backgroundColor: "#F8FAFC",
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#24324A",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  status: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
  },
  detail: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  date: {
    color: "#8793A5",
    fontSize: 11,
    marginTop: 8,
  },
  legacy: {
    color: "#9A5B00",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 13,
    borderWidth: 1,
    padding: 18,
  },
  loadingEmpty: {
    alignItems: "center",
    padding: 24,
  },
  footer: {
    alignItems: "center",
    padding: 18,
  },
  loadMore: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    padding: 13,
  },
  loadMoreText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
  },
  endText: {
    color: "#8793A5",
    fontSize: 12,
    padding: 16,
    textAlign: "center",
  },
});
