import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { m5Colors } from "@/constants/member5Theme";
import {
  getMySkills,
  getStudentDirectoryProfile,
} from "@/services/member2/skillService";
import type {
  SkillType,
  StudentDirectoryProfile,
  StudentSkill,
} from "@/types/member2/skills";
import { useAuth } from "@/providers/AuthProvider";

const skillTypeLabels: Record<SkillType, string> = {
  OFFER: "Skills they can teach",
  WANT: "Skills they want to learn",
};

const levelLabels: Record<StudentSkill["proficiencyLevel"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export default function StudentPreviewScreen() {
  const router = useRouter();
  const { userId: routeUserId } = useLocalSearchParams<{ userId: string }>();
  const userId = Array.isArray(routeUserId) ? routeUserId[0] : routeUserId;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [student, setStudent] = useState<StudentDirectoryProfile | null>(null);
  const [myOffers, setMyOffers] = useState<StudentSkill[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError("A student ID is required.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [profile, portfolio] = await Promise.all([
        getStudentDirectoryProfile(userId),
        getMySkills(),
      ]);
      if (!profile) {
        setStudent(null);
        return;
      }

      setStudent(profile);
      const offers = portfolio.filter((skill) => skill.type === "OFFER");
      setMyOffers(offers);
      setSelectedOfferId((current) =>
        offers.some((skill) => skill.id === current)
          ? current
          : offers[0]?.id ?? "",
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "The student profile could not be loaded.";
      console.error("Failed to load a student preview.", loadError);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthLoading) {
        setIsLoading(true);
        return;
      }
      if (!user?.uid) {
        setStudent(null);
        setMyOffers([]);
        setError("Sign in to view student profiles.");
        setIsLoading(false);
        return;
      }
      void loadProfile();
    }, [isAuthLoading, loadProfile, user?.uid]),
  );

  const selectedOffer = useMemo(
    () => myOffers.find((skill) => skill.id === selectedOfferId),
    [myOffers, selectedOfferId],
  );

  function requestExchange(skill: StudentSkill) {
    if (!student) return;
    if (!selectedOffer) {
      Alert.alert(
        "Add a skill first",
        "Add at least one skill you can teach before sending an exchange request.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Open My Skills",
            onPress: () => router.push("/my-skills" as Href),
          },
        ],
      );
      return;
    }
    if (selectedOffer.skillId === skill.skillId) {
      Alert.alert(
        "Choose a different skill",
        "The skill you offer and the skill you request must be different.",
      );
      return;
    }

    router.push({
      pathname: "/member4/create-exchange-request",
      params: {
        receiverId: student.userId,
        receiverName: student.displayName,
        offeredSkillId: selectedOffer.skillId,
        offeredSkillName: selectedOffer.skillName,
        requestedSkillId: skill.skillId,
        requestedSkillName: skill.skillName,
      },
    } as Href);
  }

  const groupedSkills = (["OFFER", "WANT"] as const).map((type) => ({
    type,
    skills: student?.skills.filter((skill) => skill.type === type) ?? [],
  }));

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <LoadingState label="Loading student profile..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ErrorState message={error} onRetry={() => void loadProfile()} />
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <EmptyState
          title="Profile unavailable"
          message="This student profile may have been removed or is not visible."
          action={
            <Button
              label="Back to Discover"
              onPress={() => router.replace("/explore" as Href)}
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileCard}>
          <Avatar
            name={student.displayName}
            size={76}
            uri={student.profilePhotoUrl}
          />
          <Text style={styles.name}>{student.displayName}</Text>
          <Text style={styles.meta}>
            {[student.university, student.faculty, student.course, student.location]
              .filter(Boolean)
              .join(" · ") || "LearnLink student"}
          </Text>
          {student.ratingAverage !== undefined ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={17} color={m5Colors.star} />
              <Text style={styles.ratingText}>
                {student.ratingAverage.toFixed(1)}
                {student.ratingCount ? ` (${student.ratingCount} reviews)` : ""}
              </Text>
            </View>
          ) : null}
          {student.bio ? <Text style={styles.bio}>{student.bio}</Text> : null}
        </Card>

        {myOffers.length > 0 ? (
          <Card style={styles.offerPicker}>
            <Text style={styles.sectionTitle}>Choose a skill you can offer</Text>
            <Text style={styles.sectionHint}>
              This skill will be included in your exchange request.
            </Text>
            <View style={styles.chipRow}>
              {myOffers.map((skill) => (
                <Chip
                  key={skill.id}
                  label={skill.skillName}
                  selected={selectedOfferId === skill.id}
                  onPress={() => setSelectedOfferId(skill.id)}
                />
              ))}
            </View>
          </Card>
        ) : (
          <Card style={styles.noOffersCard}>
            <Text style={styles.sectionTitle}>Add a skill to connect</Text>
            <Text style={styles.sectionHint}>
              Add a skill you can teach to send an exchange request.
            </Text>
            <Button
              label="Add a skill"
              icon="add"
              onPress={() => router.push("/skills/new" as Href)}
            />
          </Card>
        )}

        {groupedSkills.map(({ type, skills }) => (
          <View key={type} style={styles.skillGroup}>
            <Text style={styles.sectionTitle}>{skillTypeLabels[type]}</Text>
            {skills.length === 0 ? (
              <Card style={styles.emptySkills}>
                <Text style={styles.sectionHint}>No skills added yet.</Text>
              </Card>
            ) : (
              skills.map((skill) => (
                <Card key={skill.id} style={styles.skillCard}>
                  <View style={styles.skillHeader}>
                    <View style={styles.skillIcon}>
                      <Ionicons
                        name={type === "OFFER" ? "school-outline" : "book-outline"}
                        size={20}
                        color={m5Colors.primary}
                      />
                    </View>
                    <View style={styles.skillTitle}>
                      <Text style={styles.skillName}>{skill.skillName}</Text>
                      <Text style={styles.skillLevel}>
                        {type === "OFFER" ? "Level" : "Target"}:{" "}
                        {levelLabels[skill.proficiencyLevel]}
                      </Text>
                    </View>
                  </View>
                  {skill.description ? (
                    <Text style={styles.skillDescription}>{skill.description}</Text>
                  ) : null}
                  <View style={styles.skillDetails}>
                    {skill.sessionModes.map((mode) => (
                      <Chip
                        key={mode}
                        label={mode === "ONLINE" ? "Online" : "In person"}
                        tone="neutral"
                      />
                    ))}
                    {skill.availability ? (
                      <Chip label={skill.availability} tone="mint" />
                    ) : null}
                  </View>
                  {type === "OFFER" ? (
                    <Button
                      label={`Request ${skill.skillName}`}
                      icon="swap-horizontal-outline"
                      onPress={() => requestExchange(skill)}
                      variant="soft"
                      style={styles.requestButton}
                    />
                  ) : null}
                </Card>
              ))
            )}
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backLink}
        >
          <Ionicons name="arrow-back" size={17} color={m5Colors.primary} />
          <Text style={styles.backText}>Back to Discover</Text>
        </Pressable>
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
    gap: 15,
    padding: 18,
    paddingBottom: 32,
  },
  profileCard: {
    alignItems: "center",
    gap: 8,
    padding: 22,
  },
  name: {
    color: m5Colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },
  meta: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  ratingText: {
    color: m5Colors.textSecondary,
    fontSize: 13,
  },
  bio: {
    color: m5Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: "center",
  },
  offerPicker: {
    gap: 10,
    padding: 15,
  },
  noOffersCard: {
    gap: 10,
    padding: 15,
  },
  sectionTitle: {
    color: m5Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHint: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillGroup: {
    gap: 10,
  },
  emptySkills: {
    padding: 14,
  },
  skillCard: {
    gap: 11,
    padding: 15,
  },
  skillHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  skillIcon: {
    alignItems: "center",
    backgroundColor: m5Colors.primarySoft,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  skillTitle: {
    flex: 1,
  },
  skillName: {
    color: m5Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  skillLevel: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  skillDescription: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  skillDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  requestButton: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  backLink: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 7,
    paddingVertical: 8,
  },
  backText: {
    color: m5Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
