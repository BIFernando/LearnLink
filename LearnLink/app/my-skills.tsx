import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/member5/ui";
import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";
import { m5Colors } from "@/constants/member5Theme";
import { deleteUserSkill, getMySkills } from "@/services/member2/skillService";
import { useAuth } from "@/providers/AuthProvider";
import type { SkillType, StudentSkill } from "@/types/member2/skills";

export default function MySkillsRoute() {
  return (
    <StudentRouteGuard>
      <MySkillsScreen />
    </StudentRouteGuard>
  );
}

const skillTypeLabels: Record<SkillType, string> = {
  OFFER: "Skills I offer",
  WANT: "Skills I want to learn",
};

const levelLabels: Record<StudentSkill["proficiencyLevel"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export default function MySkillsScreen() {
  const router = useRouter();
  const { user, studentProfile, isLoading: isAuthLoading } = useAuth();
  const [skills, setSkills] = useState<StudentSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSkills(await getMySkills());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Your skills could not be loaded.";
      console.error("Failed to load the skill portfolio.", loadError);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAuthLoading) {
        setIsLoading(true);
        return;
      }
      if (!user?.uid) {
        setSkills([]);
        setError("Sign in to view and manage your skills.");
        setIsLoading(false);
        return;
      }
      void loadSkills();
    }, [isAuthLoading, loadSkills, user?.uid]),
  );

  function confirmDelete(skill: StudentSkill) {
    Alert.alert(
      "Remove skill?",
      `Remove ${skill.skillName} from your portfolio?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserSkill(skill.id);
              await loadSkills();
            } catch (deleteError) {
              const message =
                deleteError instanceof Error
                  ? deleteError.message
                  : "The skill could not be removed.";
              console.error("Failed to remove a portfolio skill.", deleteError);
              Alert.alert("Unable to remove skill", message);
            }
          },
        },
      ],
    );
  }

  function openEditor(skillEntryId?: string) {
    const href = skillEntryId
      ? (`/skills/${encodeURIComponent(skillEntryId)}` as Href)
      : ("/skills/new" as Href);
    router.push(href);
  }

  const displayName =
    studentProfile?.displayName ?? user?.displayName ?? "LearnLink Student";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Avatar
            name={displayName}
            size={58}
            uri={studentProfile?.profilePhotoUrl}
          />
          <View style={styles.profileText}>
            <Text style={styles.eyebrow}>YOUR PROFILE</Text>
            <Text style={styles.title} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.subtitle}>
              Build a clear portfolio so students know how you can help.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {skills.filter((skill) => skill.type === "OFFER").length}
            </Text>
            <Text style={styles.summaryLabel}>Offering</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {skills.filter((skill) => skill.type === "WANT").length}
            </Text>
            <Text style={styles.summaryLabel}>Want to learn</Text>
          </Card>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>My Skills</Text>
            <Text style={styles.sectionSubtitle}>
              Your public skill portfolio
            </Text>
          </View>
          <Button
            label="Add"
            icon="add"
            onPress={() => openEditor()}
            style={styles.addButton}
          />
        </View>

        {isLoading ? (
          <LoadingState label="Loading your skills..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadSkills()} />
        ) : skills.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="sparkles-outline"
              title="Your portfolio is ready"
              message="Add a skill you can teach or one you would like to learn."
              action={
                <Button
                  label="Add your first skill"
                  icon="add"
                  onPress={() => openEditor()}
                />
              }
            />
          </Card>
        ) : (
          (["OFFER", "WANT"] as const).map((type) => {
            const group = skills.filter((skill) => skill.type === type);
            if (group.length === 0) return null;

            return (
              <View key={type} style={styles.skillGroup}>
                <Text style={styles.groupTitle}>{skillTypeLabels[type]}</Text>
                {group.map((skill) => (
                  <Card key={skill.id} style={styles.skillCard}>
                    <View style={styles.skillTopRow}>
                      <View style={styles.skillHeading}>
                        <Text style={styles.skillName}>{skill.skillName}</Text>
                        <Text style={styles.skillCategory}>
                          {skill.categoryId ? "Catalog skill" : "Skill"}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel={`Edit ${skill.skillName}`}
                        accessibilityRole="button"
                        onPress={() => openEditor(skill.id)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={m5Colors.primary}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Remove ${skill.skillName}`}
                        accessibilityRole="button"
                        onPress={() => confirmDelete(skill)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={m5Colors.error}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.chipRow}>
                      <Chip label={levelLabels[skill.proficiencyLevel]} />
                      {skill.yearsExperience !== undefined ? (
                        <Chip
                          label={`${skill.yearsExperience} ${
                            skill.yearsExperience === 1 ? "year" : "years"
                          }`}
                          tone="neutral"
                        />
                      ) : null}
                    </View>
                    {skill.description ? (
                      <Text style={styles.description}>{skill.description}</Text>
                    ) : null}
                    {skill.sessionModes.length > 0 ? (
                      <Text style={styles.detailText}>
                        Sessions:{" "}
                        {skill.sessionModes
                          .map((mode) =>
                            mode === "IN_PERSON" ? "In person" : "Online",
                          )
                          .join(" · ")}
                      </Text>
                    ) : null}
                    {skill.availability ? (
                      <Text style={styles.detailText}>
                        Availability: {skill.availability}
                      </Text>
                    ) : null}
                  </Card>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: m5Colors.background,
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  profileText: {
    flex: 1,
  },
  eyebrow: {
    color: m5Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: m5Colors.textPrimary,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 3,
  },
  subtitle: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 15,
  },
  summaryValue: {
    color: m5Colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: m5Colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  addButton: {
    minHeight: 40,
    paddingHorizontal: 15,
  },
  emptyCard: {
    minHeight: 220,
    justifyContent: "center",
  },
  skillGroup: {
    gap: 10,
  },
  groupTitle: {
    color: m5Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  skillCard: {
    gap: 12,
    padding: 16,
  },
  skillTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  skillHeading: {
    flex: 1,
  },
  skillName: {
    color: m5Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  skillCategory: {
    color: m5Colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  description: {
    color: m5Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  detailText: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
