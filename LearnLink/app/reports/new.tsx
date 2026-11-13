import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { auth } from "../../config/firebase";
import { submitReport } from "../../services/reportSubmission";
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  type ReportReason,
  type ReportTargetType,
} from "../../types/reports";

function isTargetType(value: string | undefined): value is ReportTargetType {
  return REPORT_TARGET_TYPES.some((targetType) => targetType === value);
}

export default function NewReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
  }>();
  const targetType = isTargetType(params.targetType)
    ? params.targetType
    : undefined;
  const targetId = Array.isArray(params.targetId)
    ? params.targetId[0]
    : params.targetId;
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setError("");

    if (!auth.currentUser) {
      setError("Sign in before submitting a report.");
      return;
    }
    if (!targetType || !targetId) {
      setError("This report target is unavailable.");
      return;
    }
    if (!reason) {
      setError("Select a reason for the report.");
      return;
    }
    if (targetType === "USER" && targetId === auth.currentUser.uid) {
      setError("You cannot report your own account.");
      return;
    }
    if (description.trim().length > REPORT_DESCRIPTION_MAX_LENGTH) {
      setError(
        `Descriptions must be ${REPORT_DESCRIPTION_MAX_LENGTH} characters or fewer.`
      );
      return;
    }

    setSaving(true);
    try {
      await submitReport({
        targetType,
        targetId,
        reason,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch (submitError) {
      console.error("Failed to submit report:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit this report. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>LEARNLINK / REPORT</Text>
          <Text style={styles.title}>
            {submitted ? "Report submitted" : "Submit a report"}
          </Text>

          {submitted ? (
            <>
              <Text style={styles.body}>
                Thank you. Your report was submitted for review.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Target: {targetType?.replaceAll("_", " ") ?? "Unavailable"} ·{" "}
                {targetId ?? "No target selected"}
              </Text>

              <Text style={styles.fieldLabel}>Reason</Text>
              <View style={styles.reasonList}>
                {REPORT_REASONS.map((item) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: reason === item.value }}
                    key={item.value}
                    onPress={() => setReason(item.value)}
                    style={[
                      styles.reasonOption,
                      reason === item.value && styles.reasonSelected,
                    ]}
                  >
                    <Text style={styles.reasonText}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Additional details (optional)</Text>
              <TextInput
                editable={!saving}
                maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
                multiline
                onChangeText={setDescription}
                placeholder="Add relevant context"
                style={styles.description}
                textAlignVertical="top"
                value={description}
              />
              <Text style={styles.counter}>
                {description.length}/{REPORT_DESCRIPTION_MAX_LENGTH}
              </Text>

              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={saving || !targetType || !targetId}
                onPress={() => void handleSubmit()}
                style={[
                  styles.primaryButton,
                  (saving || !targetType || !targetId) && styles.disabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit report</Text>
                )}
              </Pressable>
              <Text style={styles.privacy}>
                Reports are reviewed by administrators. Do not include
                unnecessary sensitive information.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F3F6FB",
    flex: 1,
  },
  content: {
    alignSelf: "center",
    maxWidth: 640,
    padding: 20,
    paddingBottom: 40,
    width: "100%",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 6,
  },
  backText: {
    color: "#3159A5",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
  },
  eyebrow: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    color: "#17243A",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  body: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 20,
  },
  reasonList: {
    gap: 8,
  },
  reasonOption: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 9,
    borderWidth: 1,
    padding: 12,
  },
  reasonSelected: {
    backgroundColor: "#E7EEFA",
    borderColor: "#3159A5",
  },
  reasonText: {
    color: "#334155",
    fontSize: 14,
  },
  description: {
    borderColor: "#CBD5E1",
    borderRadius: 9,
    borderWidth: 1,
    color: "#17243A",
    minHeight: 110,
    padding: 12,
  },
  counter: {
    color: "#718096",
    fontSize: 11,
    marginTop: 5,
    textAlign: "right",
  },
  error: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
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
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.55,
  },
  privacy: {
    color: "#718096",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
});
