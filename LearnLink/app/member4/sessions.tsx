
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";

import { getUserSessions } from "../../services/member4/sessionService";
import { Session } from "../../types/member4/member4";

type SessionFilter = "UPCOMING" | "PAST";

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<SessionFilter>("UPCOMING");
  const [loading, setLoading] = useState(true);

  // Temporary ID until Member 1's authentication is integrated.
  const currentUserId = "TEST_USER_ID";

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserSessions(currentUserId);
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the user returns to this screen.
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const now = Date.now();

  const upcomingSessions = sessions.filter(
    (session) =>
      ["PROPOSED", "CONFIRMED", "IN_PROGRESS"].includes(session.status) &&
      new Date(session.scheduledAt).getTime() >= now
  );

  const pastSessions = sessions.filter(
    (session) =>
      ["COMPLETED", "CANCELLED", "DISPUTED"].includes(session.status) ||
      (
        ["PROPOSED", "CONFIRMED", "IN_PROGRESS"].includes(session.status) &&
        new Date(session.scheduledAt).getTime() < now
      )
  );

  const displayedSessions =
    filter === "UPCOMING" ? upcomingSessions : pastSessions;

  function renderSession({ item }: { item: Session }) {
    const dateValue =
      item.scheduledAt instanceof Date
        ? item.scheduledAt
        : typeof item.scheduledAt?.toDate === "function"
          ? item.scheduledAt.toDate()
          : new Date(item.scheduledAt);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/member4/session-details",
            params: { sessionId: item.id },
          })
        }
      >
        <Text style={styles.cardTitle}>
          {item.sessionType === "ONLINE" ? "Online Session" : "In-person Session"}
        </Text>

        <Text>
          Date: {Number.isNaN(dateValue.getTime())
            ? "Date unavailable"
            : dateValue.toLocaleDateString()}
        </Text>

        <Text>
          Time: {Number.isNaN(dateValue.getTime())
            ? "Time unavailable"
            : dateValue.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
        </Text>

        <Text>Duration: {item.duration} minutes</Text>
        <Text>Status: {item.status}</Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Sessions</Text>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "UPCOMING" && styles.selectedFilter,
          ]}
          onPress={() => setFilter("UPCOMING")}
        >
          <Text>Upcoming</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "PAST" && styles.selectedFilter,
          ]}
          onPress={() => setFilter("PAST")}
        >
          <Text>Past</Text>
        </TouchableOpacity>
      </View>

      {displayedSessions.length === 0 ? (
        <Text style={styles.empty}>
          No {filter.toLowerCase()} sessions found.
        </Text>
      ) : (
        <FlatList
          data={displayedSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  filterButton: {
    flex: 1,
    padding: 13,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  selectedFilter: { borderWidth: 2, backgroundColor: "#eff6ff" },
  list: { paddingBottom: 20 },
  card: { padding: 15, borderWidth: 1, borderRadius: 10, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: "bold", marginBottom: 8 },
  empty: { textAlign: "center", marginTop: 20 },
});