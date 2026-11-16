import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  getAdminModerationHistory,
  getAdminReportDetails,
  moderateAdminReport,
  type AdminReportDetails,
} from "../../../../services/adminReports";
import type {
  ModerationAction,
  ModerationHistoryRecord,
} from "../../../../types/reports";
import { REPORT_REASONS } from "../../../../types/reports";

function formatDate(value: Date | undefined): string {
  return value ? value.toLocaleString() : "Date unavailable";
}

export default function AdminReportDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reportId?: string }>();
  const reportId = Array.isArray(params.reportId)
    ? params.reportId[0]
    : params.reportId;
  const [details, setDetails] = useState<AdminReportDetails | null>(null);
  const [history, setHistory] = useState<ModerationHistoryRecord[]>([]);
  const [moderationNote, setModerationNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadReport = useCallback(async () => {
    if (!reportId) {
      setError("A report ID was not provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [reportDetails, reportHistory] = await Promise.all([
        getAdminReportDetails(reportId),
        getAdminModerationHistory(reportId),
      ]);
      setDetails(reportDetails);
      setHistory(reportHistory);
    } catch (loadError) {
      console.error("Failed to load admin report:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function performModeration(action: ModerationAction) {
    if (!details || !reportId || !details.report.recognized) {
      return;
    }

    setSaving(true);
    setError("");
    setActionMessage("");
    try {
      await moderateAdminReport({
        reportId,
        action,
        moderationNote: moderationNote.trim(),
      });
      setModerationNote("");
      setActionMessage(
        action === "RESOLVE" ? "Report resolved." : "Report rejected."
      );
      await loadReport();
    } catch (moderationError) {
      console.error("Failed to moderate report:", moderationError);
      setError(
        moderationError instanceof Error
          ? moderationError.message
          : "The moderation action could not be completed."
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmModeration(action: ModerationAction) {
    const actionLabel = action === "RESOLVE" ? "resolve" : "reject";
    Alert.alert(
      `${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} report?`,
      `This will ${actionLabel} the report and add an audit history entry.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel[0].toUpperCase() + actionLabel.slice(1),
          style: action === "REJECT" ? "destructive" : "default",
          onPress: () => void performModeration(action),
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3159A5" size="large" />
        <Text style={styles.muted}>Loading report...</Text>
      </View>
    );
  }

  if (error && !details) {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.title}>Report unavailable</Text>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <Pressable onPress={() => void loadReport()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.link}>Back to reports</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!details) {
    return null;
  }

  const { report } = details;
  const canModerate = report.recognized && report.status === "OPEN" && !saving;
  const reasonLabel = REPORT_REASONS.find(
    (reason) => reason.value === report.reason
  )?.label;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.link}>‹  Back to reports</Text>
      </Pressable>
      <Text style={styles.eyebrow}>LEARNLINK / ADMIN / REPORT</Text>
      <Text style={styles.title}>Report details</Text>
      <Text style={styles.muted}>Report ID: {report.id}</Text>

      {!report.recognized ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            This document does not match the approved report schema. It is
            read-only; no moderation action is available.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Report</Text>
        <InfoRow label="Status" value={report.status} />
        <InfoRow label="Reason" value={reasonLabel ?? report.reason} />
        <InfoRow label="Description" value={report.description} />
        <InfoRow label="Submitted" value={formatDate(report.createdAt)} />
        <InfoRow label="Reporter ID" value={report.reporterId} />
        <InfoRow
          label="Reporter name"
          value={details.reporter?.name}
        />
        <InfoRow
          label="Reporter email"
          value={details.reporter?.email}
        />
        <InfoRow label="Target type" value={report.targetType} />
        <InfoRow label="Target ID" value={report.targetId} />
      </View>

      {details.target ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reported target</Text>
          <Text style={styles.targetTitle}>{details.target.title}</Text>
          {details.target.fields.map((field) => (
            <InfoRow key={field.label} label={field.label} value={field.value} />
          ))}
        </View>
      ) : null}

      {report.reviewedBy ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Review</Text>
          <InfoRow label="Reviewed by" value={report.reviewedBy} />
          <InfoRow label="Reviewed at" value={formatDate(report.reviewedAt)} />
        </View>
      ) : null}

      {canModerate ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Moderate report</Text>
          <Text style={styles.muted}>
            Notes are visible only to administrators and are recorded in the
            moderation history.
          </Text>
          <TextInput
            editable={!saving}
            maxLength={1000}
            multiline
            onChangeText={setModerationNote}
            placeholder="Internal moderation note (optional)"
            style={styles.noteInput}
            textAlignVertical="top"
            value={moderationNote}
          />
          <View style={styles.actions}>
            <Pressable
              disabled={!canModerate}
              onPress={() => confirmModeration("RESOLVE")}
              style={[styles.resolveButton, !canModerate && styles.disabled]}
            >
              <Text style={styles.actionText}>Resolve</Text>
            </Pressable>
            <Pressable
              disabled={!canModerate}
              onPress={() => confirmModeration("REJECT")}
              style={[styles.rejectButton, !canModerate && styles.disabled]}
            >
              <Text style={styles.actionText}>Reject</Text>
            </Pressable>
          </View>
          {saving ? <ActivityIndicator style={styles.loader} color="#3159A5" /> : null}
        </View>
      ) : null}

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {actionMessage ? (
        <Text accessibilityRole="alert" style={styles.success}>
          {actionMessage}
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Moderation history</Text>
        {history.length ? (
          history.map((event) => (
            <View key={event.id} style={styles.historyEvent}>
              <Text style={styles.historyTitle}>
                {event.action ?? "Unrecognized action"} ·{" "}
                {event.previousStatus ?? "?"} to {event.newStatus ?? "?"}
              </Text>
              <InfoRow label="Admin UID" value={event.adminUid} />
              <InfoRow label="Time" value={formatDate(event.timestamp)} />
              <InfoRow label="Internal note" value={event.moderationNote} />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No moderation history is recorded.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "Not available"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    backgroundColor: "#F3F6FB",
    maxWidth: 900,
    padding: 20,
    paddingBottom: 40,
    width: "100%",
  },
  centered: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    marginTop: 4,
    paddingVertical: 5,
  },
  link: {
    color: "#3159A5",
    fontWeight: "600",
  },
  eyebrow: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  title: {
    color: "#17243A",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 6,
  },
  sectionTitle: {
    color: "#24324A",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  muted: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  infoRow: {
    borderTopColor: "#EDF1F6",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
  },
  infoLabel: {
    color: "#718096",
    flexShrink: 0,
    fontSize: 12,
    marginRight: 12,
  },
  infoValue: {
    color: "#24324A",
    flex: 1,
    fontSize: 13,
    textAlign: "right",
  },
  targetTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  warning: {
    backgroundColor: "#FFF8E8",
    borderRadius: 10,
    marginTop: 14,
    padding: 13,
  },
  warningText: {
    color: "#805B14",
    fontSize: 13,
    lineHeight: 19,
  },
  noteInput: {
    borderColor: "#CBD5E1",
    borderRadius: 9,
    borderWidth: 1,
    color: "#17243A",
    marginTop: 12,
    minHeight: 90,
    padding: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  resolveButton: {
    alignItems: "center",
    backgroundColor: "#18836A",
    borderRadius: 9,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  rejectButton: {
    alignItems: "center",
    backgroundColor: "#B54732",
    borderRadius: 9,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.55,
  },
  loader: {
    marginTop: 12,
  },
  error: {
    color: "#B42318",
    fontSize: 13,
    marginTop: 12,
  },
  success: {
    color: "#18794E",
    fontSize: 13,
    marginTop: 12,
  },
  historyEvent: {
    borderTopColor: "#EDF1F6",
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  historyTitle: {
    color: "#24324A",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 9,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 44,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
