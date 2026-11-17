
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";

import {
  acceptSessionProposal,
  confirmSessionCompletion,
  getSession,
  rejectSessionProposal,
  suggestAnotherSessionTime,
  updateSessionStatus,
  withdrawSessionProposal,
} from "../../services/member4/sessionService";

import { CREDITS_PER_SESSION } from "../../services/member4/creditService";
import { getCurrentUserId } from "../../services/member4/currentUser";
import { Session } from "../../types/member4/member4";
import { ReportActionButton } from "../../components/reports/ReportActionButton";

function parseFutureSchedule(dateValue: string, timeValue: string): Date | null {
  const dateText = dateValue.trim();
  const timeText = timeValue.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateText) ||
    !/^\d{2}:\d{2}$/.test(timeText)
  ) {
    return null;
  }

  const scheduledAt = new Date(`${dateText}T${timeText}`);
  if (
    !Number.isFinite(scheduledAt.getTime()) ||
    scheduledAt.getFullYear() !== Number(dateText.slice(0, 4)) ||
    scheduledAt.getMonth() + 1 !== Number(dateText.slice(5, 7)) ||
    scheduledAt.getDate() !== Number(dateText.slice(8, 10)) ||
    scheduledAt.getHours() !== Number(timeText.slice(0, 2)) ||
    scheduledAt.getMinutes() !== Number(timeText.slice(3, 5)) ||
    scheduledAt.getTime() <= Date.now()
  ) {
    return null;
  }

  return scheduledAt;
}

function hasValidProposalProposer(session: Session): boolean {
  const proposedBy = session.proposedBy;
  return (
    typeof proposedBy === "string" &&
    proposedBy.length > 0 &&
    proposedBy.trim() === proposedBy &&
    (proposedBy === session.teacherId || proposedBy === session.learnerId)
  );
}

export default function SessionDetailsScreen() {
  const { sessionId } = useLocalSearchParams<{
    sessionId: string;
  }>();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [suggestionDate, setSuggestionDate] = useState("");
  const [suggestionTime, setSuggestionTime] = useState("");
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const actionLock = useRef(false);

  const loadSession = useCallback(
    async (showError = true): Promise<boolean> => {
      if (!sessionId || Array.isArray(sessionId)) {
        setSession(null);
        setLoading(false);
        return false;
      }

      try {
        setLoading(true);
        const result = await getSession(sessionId);
        setSession(result);
        return true;
      } catch (error) {
        console.error("Failed to load session:", error);
        if (showError) {
          Alert.alert("Error", "Could not load session details.");
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [loadSession])
  );

  async function runSessionAction(
    operation: (id: string) => Promise<void>,
    successTitle: string,
    successMessage: string,
    errorTitle: string
  ): Promise<boolean> {
    if (!session || actionLoading || actionLock.current) return false;

    actionLock.current = true;
    setActionLoading(true);
    try {
      await operation(session.id);
      const refreshed = await loadSession(false);
      Alert.alert(
        successTitle,
        refreshed
          ? successMessage
          : `${successMessage} Session details could not be refreshed.`
      );
      return true;
    } catch (error) {
      console.error(`${errorTitle} failed:`, error);
      Alert.alert(
        errorTitle,
        error instanceof Error ? error.message : "Please try again."
      );
      return false;
    } finally {
      actionLock.current = false;
      setActionLoading(false);
    }
  }

  function handleAcceptProposal() {
    void runSessionAction(
      acceptSessionProposal,
      "Proposal accepted",
      "The session is now confirmed.",
      "Could not accept proposal"
    );
  }

  function handleRejectProposal() {
    if (!session || actionLoading || actionLock.current) return;

    Alert.alert(
      "Reject Proposal",
      "Are you sure you want to reject this proposed time?",
      [
        { text: "Keep Proposal", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            void runSessionAction(
              rejectSessionProposal,
              "Proposal rejected",
              "The proposed time has been rejected.",
              "Could not reject proposal"
            );
          },
        },
      ]
    );
  }

  function handleWithdrawProposal() {
    if (!session || actionLoading || actionLock.current) return;

    Alert.alert(
      "Withdraw Proposal",
      "Are you sure you want to withdraw this proposed time?",
      [
        { text: "Keep Proposal", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: () => {
            void runSessionAction(
              withdrawSessionProposal,
              "Proposal withdrawn",
              "The proposed time has been withdrawn.",
              "Could not withdraw proposal"
            );
          },
        },
      ]
    );
  }

  async function handleSuggestAnotherTime() {
    if (!session || actionLoading || actionLock.current) return;

    const scheduledAt = parseFutureSchedule(suggestionDate, suggestionTime);
    if (!scheduledAt) {
      Alert.alert(
        "Invalid date or time",
        "Enter a valid future date as YYYY-MM-DD and time as 24-hour HH:mm."
      );
      return;
    }

    const succeeded = await runSessionAction(
      (id) => suggestAnotherSessionTime(id, scheduledAt),
      "New time suggested",
      "Your suggested time has been sent to the other participant.",
      "Could not suggest another time"
    );

    if (succeeded) {
      setShowSuggestionForm(false);
      setSuggestionDate("");
      setSuggestionTime("");
    }
  }

  function handleCancel() {
    if (
      !session ||
      actionLoading ||
      actionLock.current ||
      session.status !== "CONFIRMED"
    ) {
      return;
    }

    Alert.alert(
      "Cancel Session",
      "Are you sure you want to cancel this session?",
      [
        { text: "Keep Session", style: "cancel" },
        {
          text: "Cancel Session",
          style: "destructive",
          onPress: () => {
            void runSessionAction(
              (id) => updateSessionStatus(id, "CANCELLED"),
              "Session Cancelled",
              "The session has been cancelled.",
              "Could not cancel session"
            );
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

              const result = await confirmSessionCompletion(sessionId);

              await loadSession();

              Alert.alert(
                result !== "WAITING_FOR_OTHER"
                  ? "Session Completed"
                  : "Confirmation Recorded",
                result === "COMPLETED_WITH_CREDITS"
                  ? `Both participants confirmed completion. ${CREDITS_PER_SESSION} credits were transferred from the learner to the teacher.`
                  : result === "COMPLETED"
                    ? "Both participants confirmed completion. No credits were transferred for this DIRECT exchange."
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

  const validProposalProposer = hasValidProposalProposer(session);
  const canWithdrawProposal =
    isParticipant &&
    session.status === "PROPOSED" &&
    validProposalProposer &&
    session.proposedBy === currentUserId;
  const canRespondToProposal =
    isParticipant &&
    session.status === "PROPOSED" &&
    validProposalProposer &&
    session.proposedBy !== currentUserId;
  const hasUnknownProposalProposer =
    isParticipant &&
    session.status === "PROPOSED" &&
    !validProposalProposer;
  const canCancelConfirmed =
    isParticipant && session.status === "CONFIRMED";

  const canConfirmCompletion =
    ["CONFIRMED", "IN_PROGRESS"].includes(session.status) &&
    Date.now() >= scheduledDate.getTime();

  const canGenerateAttendanceQr =
    currentUserId === session.teacherId &&
    session.sessionType === "IN_PERSON" &&
    ["CONFIRMED", "IN_PROGRESS"].includes(session.status);

  const canScanAttendanceQr =
    currentUserId === session.learnerId &&
    session.sessionType === "IN_PERSON" &&
    ["CONFIRMED", "IN_PROGRESS"].includes(session.status);

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

      {canGenerateAttendanceQr && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/member4/attendance-qr",
              params: { sessionId: session.id },
            } as unknown as Href)
          }
        >
          <Text style={styles.buttonText}>Generate Attendance QR</Text>
        </TouchableOpacity>
      )}

      {canScanAttendanceQr && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/member4/attendance-scan",
              params: { sessionId: session.id },
            } as unknown as Href)
          }
        >
          <Text style={styles.buttonText}>Scan Attendance QR</Text>
        </TouchableOpacity>
      )}

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
            You have confirmed completion. Waiting for the other participant.
          </Text>
        )}

      {session.status === "COMPLETED" && (
        <Text style={styles.notice}>
          {session.creditsTransferred
            ? "Session completed. Credits were transferred from the learner to the teacher."
            : "Session completed."}
        </Text>
      )}

      {/* Member 5: review entry point */}
      {isParticipant && session.status === "COMPLETED" && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/reviews/give/[sessionId]",
              params: { sessionId: session.id },
            })
          }
        >
          <Text style={styles.buttonText}>Give Review</Text>
        </TouchableOpacity>
      )}

      {canWithdrawProposal && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Proposal</Text>
          <Text style={styles.value}>
            The other participant must respond to this proposed time.
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleWithdrawProposal}
            disabled={actionLoading}
          >
            <Text style={styles.buttonText}>Withdraw Proposal</Text>
          </TouchableOpacity>
        </View>
      )}

      {canRespondToProposal && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Respond to Proposal</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAcceptProposal}
            disabled={actionLoading}
          >
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleRejectProposal}
            disabled={actionLoading}
          >
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowSuggestionForm((visible) => !visible)}
            disabled={actionLoading}
          >
            <Text style={styles.secondaryButtonText}>
              {showSuggestionForm ? "Hide Suggested Time" : "Suggest Another Time"}
            </Text>
          </TouchableOpacity>
          {showSuggestionForm && (
            <View style={styles.suggestionForm}>
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={suggestionDate}
                onChangeText={setSuggestionDate}
                placeholder="2026-12-15"
                autoCapitalize="none"
              />
              <Text style={styles.label}>Time (24-hour HH:mm)</Text>
              <TextInput
                style={styles.input}
                value={suggestionTime}
                onChangeText={setSuggestionTime}
                placeholder="14:30"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSuggestAnotherTime}
                disabled={actionLoading}
              >
                <Text style={styles.buttonText}>Send Suggested Time</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {hasUnknownProposalProposer && (
        <Text style={styles.notice}>
          The proposer for this session is unknown. Proposal actions are unavailable.
        </Text>
      )}

      {canCancelConfirmed && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={actionLoading}
        >
          <Text style={styles.buttonText}>Cancel Session</Text>
        </TouchableOpacity>
      )}

      {isParticipant ? (
        <View style={styles.reportActions}>
          <ReportActionButton
            targetType="USER"
            targetId={
              currentUserId === session.teacherId
                ? session.learnerId
                : session.teacherId
            }
            label="Report the other participant"
          />
          <ReportActionButton
            targetType="SESSION"
            targetId={session.id}
            label="Report this session"
          />
        </View>
      ) : null}

      {actionLoading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
          <Text style={styles.progressText}>Updating session...</Text>
        </View>
      )}

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
  suggestionForm: { marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginTop: 6, marginBottom: 12 },
  reportActions: { marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  notice: { marginVertical: 12, textAlign: "center" },
  loader: { marginVertical: 12, alignItems: "center" },
  progressText: { marginTop: 8 },
  backButton: { borderWidth: 1, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
});
