import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  getAdminUserDetails,
  type AdminUserDetails,
} from "../../../../services/adminUsers";

export default function AdminUserDetailsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUser = useCallback(async () => {
    if (!userId) {
      setError("A user ID was not provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const details = await getAdminUserDetails(userId);
      setUser(details);
    } catch (loadError) {
      console.error("Failed to load admin user details:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this user. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3159A5" size="large" />
        <Text style={styles.centeredText}>Loading user details...</Text>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.title}>User details unavailable</Text>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error || "No details are available for this user."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadUser()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/admin/users")}
            style={styles.backButton}
          >
            <Text style={styles.backText}>Back to users</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const accountStatus =
    typeof user.isActive === "boolean"
      ? user.isActive
        ? "Active"
        : "Inactive (this does not establish suspension)"
      : "Unavailable";

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.page}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace("/admin/users")}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹  Back to users</Text>
        </Pressable>

        <Text style={styles.eyebrow}>LEARNLINK / ADMIN / USER</Text>
        <Text style={styles.title}>{user.displayName ?? "User details"}</Text>
        <Text style={styles.subtitle}>Account ID: {user.id}</Text>

        <InfoSection title="Account">
          <InfoRow label="Name" value={user.displayName} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="University ID" value={user.universityId} />
          <InfoRow label="Account status" value={accountStatus} />
          <InfoRow
            label="Skill credits"
            value={
              typeof user.skillCredits === "number"
                ? String(user.skillCredits)
                : undefined
            }
          />
        </InfoSection>

        <InfoSection title="Profile">
          <InfoRow label="Location" value={user.location} />
          <InfoRow label="Bio" value={user.bio} />
          <InfoRow
            label="Profile photo URL"
            value={user.profilePhotoUrl}
            multiline
          />
          <InfoRow
            label="Rating"
            value={
              typeof user.ratingAverage === "number"
                ? `${user.ratingAverage}${typeof user.ratingCount === "number" ? ` (${user.ratingCount} ratings)` : ""}`
                : undefined
            }
          />
        </InfoSection>

        <InfoSection title="Skills">
          {user.skills.length ? (
            user.skills.map((skill) => (
              <View key={skill.id} style={styles.skillCard}>
                <Text style={styles.skillName}>{skill.name}</Text>
                {skill.details.length ? (
                  skill.details.map((detail) => (
                    <InfoRow
                      key={detail.label}
                      label={detail.label}
                      value={detail.value}
                    />
                  ))
                ) : (
                  <Text style={styles.mutedText}>
                    No additional skill details recorded.
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>
              No user-linked skills were found.
            </Text>
          )}
          {user.skillsMayBeTruncated ? (
            <Text style={styles.recommendation}>
              Showing the first 100 user-linked skill records.
            </Text>
          ) : null}
        </InfoSection>

        <InfoSection title="Moderation">
          <Text style={styles.mutedText}>
            Suspend/reactivate actions are unavailable. The current user schema
            has no suspension fields or moderation history, and the existing
            security rules do not enforce suspended-account restrictions.
          </Text>
          <Text style={styles.recommendation}>
            Recommended schema for team review: isSuspended, suspensionReason,
            suspendedAt, and suspendedBy, with append-only moderation action
            records. Approval and coordinated Firestore rules/backend changes
            are required before enabling account actions.
          </Text>
        </InfoSection>
      </View>
    </ScrollView>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.infoRow, multiline && styles.infoRowStacked]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && styles.multilineValue]}>
        {value ?? "Not available"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    padding: 20,
    paddingBottom: 40,
  },
  page: {
    maxWidth: 820,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 460,
    padding: 24,
    width: "100%",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
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
    marginBottom: 8,
  },
  title: {
    color: "#17243A",
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: "#718096",
    fontSize: 13,
    marginBottom: 8,
    marginTop: 6,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  sectionTitle: {
    color: "#24324A",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  sectionContent: {
    gap: 2,
  },
  infoRow: {
    alignItems: "flex-start",
    borderTopColor: "#EDF1F6",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  infoRowStacked: {
    flexDirection: "column",
  },
  infoLabel: {
    color: "#718096",
    fontSize: 13,
    marginRight: 14,
  },
  infoValue: {
    color: "#24324A",
    flexShrink: 1,
    fontSize: 13,
    textAlign: "right",
  },
  multilineValue: {
    marginTop: 6,
    textAlign: "left",
  },
  skillCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E6EBF2",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  skillName: {
    color: "#24324A",
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 8,
  },
  mutedText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
  },
  recommendation: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 21,
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
});
