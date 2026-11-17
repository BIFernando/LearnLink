
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";

import { useAuth } from "../../providers/AuthProvider";
import { getSkillName } from "../../services/chatService";
import { getUserSessions } from "../../services/member4/sessionService";
import {
  displayNameOf,
  useUserProfiles,
} from "../../services/member5/userService";
import { Session } from "../../types/member4/member4";
import { getCurrentUserId } from "../../services/member4/currentUser";

type SessionFilter = "UPCOMING" | "PAST";

function getScheduledDate(value: unknown): Date | null {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0)
  ) {
    return null;
  }

  let date: unknown;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "object") {
    try {
      const toDate = (value as { toDate?: () => unknown }).toDate;
      if (typeof toDate !== "function") {
        return null;
      }
      date = toDate.call(value);
    } catch {
      return null;
    }
  } else {
    return null;
  }

  if (!(date instanceof Date)) {
    return null;
  }

  try {
    return Number.isFinite(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

function hasValidProposer(
  session: Session
): session is Session & { proposedBy: string } {
  const proposedBy = session.proposedBy;
  return (
    typeof proposedBy === "string" &&
    proposedBy.length > 0 &&
    proposedBy.trim() === proposedBy &&
    (proposedBy === session.teacherId || proposedBy === session.learnerId)
  );
}

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<SessionFilter>("UPCOMING");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const userProfiles = useUserProfiles(
    sessions.flatMap((session) => [
      session.teacherId,
      session.learnerId,
      ...(typeof session.proposedBy === "string" ? [session.proposedBy] : []),
    ])
  );
  const [skillNames, setSkillNames] = useState<Record<string, string | null>>(
    {}
  );

  useEffect(() => {
    let active = true;
    const skillIds = [...new Set(sessions.map((session) => session.skillId))];

    Promise.all(
      skillIds.map(async (skillId) => [skillId, await getSkillName(skillId)] as const)
    )
      .then((entries) => {
        if (active) {
          setSkillNames((current) => ({
            ...current,
            ...Object.fromEntries(entries),
          }));
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load session skill names:", error);
        if (active) {
          setSkillNames((current) => ({
            ...current,
            ...Object.fromEntries(skillIds.map((skillId) => [skillId, null])),
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [sessions]);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const currentUserId = getCurrentUserId();
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

  const proposedSessions = sessions.filter(
    (session) => session.status === "PROPOSED"
  );
  const futureProposals = proposedSessions.filter((session) => {
    const date = getScheduledDate(session.scheduledAt);
    return date !== null && date.getTime() >= now;
  });
  const pastProposals = proposedSessions.filter((session) => {
    const date = getScheduledDate(session.scheduledAt);
    return date !== null && date.getTime() < now;
  });
  const unknownDateProposals = proposedSessions.filter(
    (session) => getScheduledDate(session.scheduledAt) === null
  );
  const unknownDateProposerProposals = unknownDateProposals.filter(
    (session) => !hasValidProposer(session)
  );
  const unknownDateKnownProposals = unknownDateProposals.filter((session) =>
    hasValidProposer(session)
  );
  const incomingProposals = user
    ? futureProposals.filter(
        (session) =>
          hasValidProposer(session) &&
          session.proposedBy !== user.uid
      )
    : [];
  const awaitingResponse = user
    ? futureProposals.filter(
        (session) =>
          hasValidProposer(session) &&
          session.proposedBy === user.uid
      )
    : [];
  const unknownProposerProposals = futureProposals.filter(
    (session) => !hasValidProposer(session)
  );
  const pastUnknownProposals = pastProposals.filter(
    (session) => !hasValidProposer(session)
  );

  const upcomingSessions = sessions.filter(
    (session) => {
      if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
        return false;
      }

      const date = getScheduledDate(session.scheduledAt);
      return date !== null && date.getTime() >= now;
    }
  );

  const pastSessions = sessions.filter(
    (session) => {
      if (["COMPLETED", "CANCELLED", "DISPUTED"].includes(session.status)) {
        return true;
      }
      if (
        !["PROPOSED", "CONFIRMED", "IN_PROGRESS"].includes(session.status) ||
        (session.status === "PROPOSED" &&
          !hasValidProposer(session))
      ) {
        return false;
      }

      const date = getScheduledDate(session.scheduledAt);
      return date !== null && date.getTime() < now;
    }
  );

  const displayedSessions =
    filter === "UPCOMING" ? upcomingSessions : pastSessions;

  function openSessionDetails(sessionId: string) {
    router.push({
      pathname: "/member4/session-details",
      params: { sessionId },
    });
  }

  function getStudentDisplayName(userId: string): string {
    return Object.prototype.hasOwnProperty.call(userProfiles, userId)
      ? displayNameOf(userProfiles[userId])
      : "Loading student...";
  }

  function getSkillDisplayName(skillId: string): string {
    if (!Object.prototype.hasOwnProperty.call(skillNames, skillId)) {
      return "Loading skill...";
    }
    return skillNames[skillId] ?? "Skill unavailable";
  }

  function renderSession({ item }: { item: Session }) {
    const dateValue = getScheduledDate(item.scheduledAt);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openSessionDetails(item.id)}
      >
        <Text style={styles.cardTitle}>
          {item.sessionType === "ONLINE" ? "Online Session" : "In-person Session"}
        </Text>

        <Text>
          Date: {dateValue === null
            ? "Date unavailable"
            : dateValue.toLocaleDateString()}
        </Text>

        <Text>
          Time: {dateValue === null
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

  function renderProposal(
    session: Session,
    category: "INCOMING" | "OUTGOING" | "UNKNOWN" | "DATE_UNKNOWN"
  ) {
    const dateValue = getScheduledDate(session.scheduledAt);
    const otherParticipantId =
      user?.uid === session.teacherId ? session.learnerId : session.teacherId;
    const proposer = hasValidProposer(session)
      ? session.proposedBy
      : null;
    let proposalStatus = "Proposer unknown";
    if (category === "INCOMING" && proposer) {
      proposalStatus = `Proposed by: ${getStudentDisplayName(proposer)}`;
    } else if (category === "OUTGOING") {
      proposalStatus = "The other participant must respond.";
    } else if (category === "DATE_UNKNOWN" && proposer) {
      proposalStatus =
        proposer === user?.uid
          ? "You proposed this time; awaiting response."
          : `Proposed by: ${getStudentDisplayName(proposer)}`;
    }
    const content = (
      <>
        <Text style={styles.cardTitle}>
          {session.sessionType === "ONLINE" ? "Online Session" : "In-person Session"}
        </Text>
        <Text>Other participant: {getStudentDisplayName(otherParticipantId)}</Text>
        <Text>Skill: {getSkillDisplayName(session.skillId)}</Text>
        <Text>
          Date: {dateValue === null
            ? "Date unavailable"
            : dateValue.toLocaleDateString()}
        </Text>
        <Text>
          Time: {dateValue === null
            ? "Time unavailable"
            : dateValue.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
        </Text>
        <Text>Duration: {session.duration} minutes</Text>
        <Text style={styles.proposalStatus}>{proposalStatus}</Text>
      </>
    );

    if (!proposer) {
      return (
        <View key={session.id} style={styles.card}>
          {content}
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={session.id}
        style={styles.card}
        onPress={() => openSessionDetails(session.id)}
      >
        {content}
      </TouchableOpacity>
    );
  }

  const hasVisibleSessions =
    displayedSessions.length > 0 ||
    (filter === "UPCOMING" &&
      (incomingProposals.length > 0 ||
        awaitingResponse.length > 0 ||
        unknownProposerProposals.length > 0 ||
        unknownDateProposals.length > 0)) ||
    (filter === "PAST" && pastUnknownProposals.length > 0);

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

      <FlatList
        data={displayedSessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {filter === "UPCOMING" && (
              <>
                <Text style={styles.sectionHeader}>Incoming Proposals</Text>
                {incomingProposals.length === 0 ? (
                  <Text style={styles.sectionEmpty}>No incoming proposals.</Text>
                ) : (
                  incomingProposals.map((session) =>
                    renderProposal(session, "INCOMING")
                  )
                )}

                <Text style={styles.sectionHeader}>Awaiting Response</Text>
                {awaitingResponse.length === 0 ? (
                  <Text style={styles.sectionEmpty}>
                    No proposals awaiting a response.
                  </Text>
                ) : (
                  awaitingResponse.map((session) =>
                    renderProposal(session, "OUTGOING")
                  )
                )}

                {unknownProposerProposals.length > 0 && (
                  <>
                    <Text style={styles.sectionHeader}>Proposer Unknown</Text>
                    {unknownProposerProposals.map((session) =>
                      renderProposal(session, "UNKNOWN")
                    )}
                  </>
                )}
              </>
            )}
            {filter === "PAST" && pastUnknownProposals.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Proposer Unknown</Text>
                {pastUnknownProposals.map((session) =>
                  renderProposal(session, "UNKNOWN")
                )}
              </>
            )}
            {filter === "UPCOMING" && unknownDateProposals.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Proposal Date Unknown</Text>
                {unknownDateKnownProposals.map((session) =>
                  renderProposal(session, "DATE_UNKNOWN")
                )}
                {unknownDateProposerProposals.length > 0 && (
                  <>
                    <Text style={styles.sectionHeader}>Proposer Unknown</Text>
                    {unknownDateProposerProposals.map((session) =>
                      renderProposal(session, "UNKNOWN")
                    )}
                  </>
                )}
              </>
            )}
            {!hasVisibleSessions && (
              <Text style={styles.empty}>
                No {filter.toLowerCase()} sessions found.
              </Text>
            )}
          </View>
        }
      />
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
  sectionHeader: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  sectionEmpty: { textAlign: "center", color: "#666", marginBottom: 12 },
  proposalStatus: { marginTop: 6, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 20 },
});