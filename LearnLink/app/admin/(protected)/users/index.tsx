import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import {
  getAdminUsersPage,
  type AdminUserRecord,
} from "../../../../services/adminUsers";

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [cursor, setCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const loadFirstPage = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++requestId.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadingMore(false);
    setError("");

    try {
      const page = await getAdminUsersPage(null);
      if (requestId.current !== currentRequestId) {
        return;
      }

      setUsers(page.users);
      setCursor(page.lastDocument);
      setHasMore(page.hasMore);
    } catch (loadError) {
      console.error("Failed to load admin user list:", loadError);
      if (requestId.current === currentRequestId) {
        setError(
          "Could not load users. Check your connection and administrator access, then try again."
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
    void loadFirstPage();
    return () => {
      requestId.current += 1;
    };
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) {
      return;
    }

    const currentRequestId = requestId.current;
    setLoadingMore(true);
    setError("");

    try {
      const page = await getAdminUsersPage(cursor);
      if (requestId.current !== currentRequestId) {
        return;
      }

      setUsers((currentUsers) => [...currentUsers, ...page.users]);
      setCursor(page.lastDocument);
      setHasMore(page.hasMore);
    } catch (loadError) {
      console.error("Failed to load more admin users:", loadError);
      if (requestId.current === currentRequestId) {
        setError(
          "Could not load more users. Check your connection and try again."
        );
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoadingMore(false);
      }
    }
  }, [cursor, hasMore, loadingMore]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) =>
      [
        user.id,
        user.displayName,
        user.email,
        user.universityId,
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
    );
  }, [search, users]);

  function renderUser({ item }: { item: AdminUserRecord }) {
    const status =
      typeof item.isActive === "boolean"
        ? item.isActive
          ? "Active"
          : "Inactive · suspension unknown"
        : "Status unavailable";

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: "/admin/users/[userId]",
            params: { userId: item.id },
          })
        }
        style={({ pressed }) => [
          styles.userCard,
          pressed && styles.userCardPressed,
        ]}
      >
        <View style={styles.userCopy}>
          <Text style={styles.userName}>
            {item.displayName ?? "Name unavailable"}
          </Text>
          <Text numberOfLines={1} style={styles.userEmail}>
            {item.email ?? "Email not available in profile"}
          </Text>
          <Text style={styles.userMeta}>
            University ID: {item.universityId ?? "Not provided"}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            item.isActive === true
              ? styles.activePill
              : item.isActive === false
                ? styles.inactivePill
                : styles.unknownPill,
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </Pressable>
    );
  }

  function renderHeader() {
    return (
      <View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace("/admin")}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>‹  Admin dashboard</Text>
        </Pressable>
        <Text style={styles.eyebrow}>LEARNLINK / ADMIN</Text>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          Browse registered accounts. Account status reflects the stored
          isActive field and does not indicate suspension.
        </Text>
        <TextInput
          accessibilityLabel="Search loaded users"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Search loaded users by name, email, ID..."
          placeholderTextColor="#8793A5"
          style={styles.searchInput}
          value={search}
        />
        <Text style={styles.resultsText}>
          {search.trim()
            ? `${filteredUsers.length} matching loaded user${filteredUsers.length === 1 ? "" : "s"}`
            : `${users.length}${hasMore ? "+" : ""} user${users.length === 1 ? "" : "s"} loaded`}
        </Text>
        {error ? (
          <View style={styles.inlineError}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadFirstPage(true)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
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
      return users.length ? (
        <Text style={styles.endText}>You’ve reached the end of the user list.</Text>
      ) : null;
    }

    return (
      <Pressable
        accessibilityRole="button"
        disabled={loadingMore}
        onPress={() => void loadMore()}
        style={styles.loadMoreButton}
      >
        <Text style={styles.loadMoreText}>Load more users</Text>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3159A5" size="large" />
        <Text style={styles.centeredText}>Loading users...</Text>
      </View>
    );
  }

  if (error && users.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorCard}>
          <Text style={styles.title}>Users unavailable</Text>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadFirstPage()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={filteredUsers}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {users.length === 0 ? "No users found" : "No matching users"}
          </Text>
          <Text style={styles.emptyText}>
            {users.length === 0
              ? "The users collection has no registered accounts."
              : "Try another search. Search currently covers the users loaded so far."}
          </Text>
        </View>
      }
      ListFooterComponent={renderFooter}
      ListHeaderComponent={renderHeader}
      refreshControl={
        <RefreshControl
          onRefresh={() => void loadFirstPage(true)}
          refreshing={refreshing}
          tintColor="#3159A5"
        />
      }
      renderItem={renderUser}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: "#F3F6FB",
    flex: 1,
  },
  listContent: {
    alignSelf: "center",
    maxWidth: 920,
    padding: 20,
    paddingBottom: 36,
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
  backLink: {
    alignSelf: "flex-start",
    marginBottom: 22,
    paddingVertical: 5,
  },
  backLinkText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
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
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 7,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 11,
    borderWidth: 1,
    color: "#17243A",
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  resultsText: {
    color: "#718096",
    fontSize: 12,
    marginBottom: 12,
    marginTop: 9,
  },
  userCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
    minHeight: 92,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  userCardPressed: {
    backgroundColor: "#F8FAFC",
  },
  userCopy: {
    flex: 1,
    paddingRight: 10,
  },
  userName: {
    color: "#24324A",
    fontSize: 15,
    fontWeight: "700",
  },
  userEmail: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
  },
  userMeta: {
    color: "#718096",
    fontSize: 12,
    marginTop: 5,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 12,
    maxWidth: 154,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  activePill: {
    backgroundColor: "#E5F5EF",
  },
  inactivePill: {
    backgroundColor: "#FFF1E9",
  },
  unknownPill: {
    backgroundColor: "#EEF2F7",
  },
  statusText: {
    color: "#43536B",
    fontSize: 11,
    fontWeight: "600",
  },
  inlineError: {
    backgroundColor: "#FFF4F2",
    borderRadius: 10,
    marginBottom: 12,
    padding: 12,
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 440,
    padding: 24,
    width: "100%",
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  retryText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 46,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 5,
    padding: 20,
  },
  emptyTitle: {
    color: "#24324A",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  footer: {
    alignItems: "center",
    padding: 18,
  },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 5,
    minHeight: 46,
  },
  loadMoreText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "700",
  },
  endText: {
    color: "#8793A5",
    fontSize: 12,
    padding: 18,
    textAlign: "center",
  },
});
