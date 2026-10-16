
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import {
  confirmSessionCompletion,
  getSession,
  updateSessionStatus,
} from "../../services/member4/sessionService";

import { getCurrentUserId } from "../../services/member4/currentUser";
import { Session } from "../../types/member4/member4";

export default function SessionDetailsScreen() {
  const { sessionId } = useLocalSearchParams<{
    sessionId: string;
  }>();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSession = useCallback(async () => {
    if (!sessionId || Array.isArray(sessionId)) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentUserId = getCurrentUserId();
      const result = await getSession(sessionId);
      setSession(result);
    } catch (error) {
      console.error("Failed to load session:", error);
      Alert.alert("Error", "Could not load session details.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [loadSession])
  );

  async function handleCancel() {
    if (!session) return;

    Alert.alert(
      "Cancel Session",
      "Are you sure you want to cancel this session?",
      [
        { text: "Keep Session", style: "cancel" },
        {
          text: "Cancel Session",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await updateSessionStatus(session.id, "CANCELLED");
              await loadSession();
              Alert.alert("Session Cancelled", "The session has been cancelled.");
            } catch (error) {
              console.error("Failed to cancel session:", error);
              Alert.alert("Error", "Could not cancel the session.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleCompletion() {
    if (!session) return;

    Alert.alert(
      "Confirm Completion",
      "Confirm that you have completed this session?",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setActionLoading(true);
              const currentUserId = getCurrentUserId();

              const result = await confirmSessionCompletion(
                session.id,
                currentUserId
              );

              await loadSession();

              Alert.alert(
                result === "COMPLETED"
                  ? "Session Completed"
                  : "Confirmation Recorded",
                result === "COMPLETED"
                  ? "Both participants have confirmed completion."
                  : "Your confirmation is saved. The other participant must also confirm."
              );
            } catch (error) {
              console.error("Failed to confirm completion:", error);
              Alert.alert(
                "Unable to Confirm",
                error instanceof Error
                  ? error.message
                  : "Could not record your confirmation."
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  async function openMeetingLink() {
    if (!session?.meetingLink) return;

    try {
      await Linking.openURL(session.meetingLink);
    } catch (error) {
      console.error("Could not open meeting link:", error);
      Alert.alert("Error", "Could not open the meeting link.");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading session...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Session not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const currentUserId = getCurrentUserId();
  const scheduledDate =
    typeof session.scheduledAt?.toDate === "function"
      ? session.scheduledAt.toDate()
      : new Date(session.scheduledAt);

  const isParticipant =
    currentUserId === session.teacherId ||
    currentUserId === session.learnerId;

  const canCancel =
    ["PROPOSED", "CONFIRMED"].includes(session.status);

  const canConfirmCompletion =
    ["CONFIRMED", "IN_PROGRESS"].includes(session.status) &&
    Date.now() >= scheduledDate.getTime();

  const alreadyConfirmed =
    session.completedBy?.includes(currentUserId) ?? false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.header}>Session Details</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Session ID</Text>
        <Text style={styles.value}>{session.id}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.status}>{session.status}</Text>

        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>
          {Number.isNaN(scheduledDate.getTime())
            ? "Date unavailable"
            : scheduledDate.toLocaleDateString()}
        </Text>

        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>
          {Number.isNaN(scheduledDate.getTime())
            ? "Time unavailable"
            : scheduledDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
        </Text>

        <Text style={styles.label}>Duration</Text>
        <Text style={styles.value}>{session.duration} minutes</Text>

        <Text style={styles.label}>Session Type</Text>
        <Text style={styles.value}>{session.sessionType}</Text>

        <Text style={styles.label}>Teacher ID</Text>
        <Text style={styles.value}>{session.teacherId}</Text>

        <Text style={styles.label}>Learner ID</Text>
        <Text style={styles.value}>{session.learnerId}</Text>

        {session.sessionType === "ONLINE" && session.meetingLink ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openMeetingLink}
          >
            <Text style={styles.secondaryButtonText}>Open Meeting Link</Text>
          </TouchableOpacity>
        ) : null}

        {session.sessionType === "IN_PERSON" ? (
          <>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>
              {session.location || "Location not provided"}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Completion Confirmation</Text>
        <Text style={styles.value}>
          Teacher: {session.completedBy?.includes(session.teacherId)
            ? "Confirmed"
            : "Waiting"}
        </Text>
        <Text style={styles.value}>
          Learner: {session.completedBy?.includes(session.learnerId)
            ? "Confirmed"
            : "Waiting"}
        </Text>
      </View>

      {isParticipant && canConfirmCompletion && !alreadyConfirmed && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCompletion}
          disabled={actionLoading}
        >
          <Text style={styles.buttonText}>Confirm Session Completed</Text>
        </TouchableOpacity>
      )}

      {alreadyConfirmed &&
        session.status !== "COMPLETED" && (
          <Text style={styles.notice}>
            You've confirmed completion. Waiting for the other participant.
          </Text>
        )}

      {isParticipant && canCancel && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={actionLoading}
        >
          <Text style={styles.buttonText}>Cancel Session</Text>
        </TouchableOpacity>
      )}

      {actionLoading && <ActivityIndicator style={styles.loader} size="large" />}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { fontSize: 27, fontWeight: "bold", marginBottom: 20 },
  card: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 16, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, color: "#666" },
  value: { fontSize: 16, marginTop: 4 },
  status: { fontSize: 17, fontWeight: "bold", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  primaryButton: { backgroundColor: "#2563eb", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  secondaryButton: { backgroundColor: "#e5e7eb", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 20 },
  secondaryButtonText: { fontWeight: "600" },
  cancelButton: { backgroundColor: "#c62828", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  notice: { marginVertical: 12, textAlign: "center" },
  loader: { marginVertical: 12 },
  backButton: { borderWidth: 1, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
});
