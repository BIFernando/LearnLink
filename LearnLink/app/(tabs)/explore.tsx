import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

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
  getDiscoverPage,
  getSkillCategories,
  type DiscoverPage,
} from "@/services/member2/skillService";
import { useAuth } from "@/providers/AuthProvider";
import type {
  SessionMode,
  SkillCategory,
  StudentDirectoryProfile,
} from "@/types/member2/skills";

const PAGE_START: QueryDocumentSnapshot<DocumentData> | null = null;

export default function DiscoverScreen() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [students, setStudents] = useState<StudentDirectoryProfile[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [lastDocument, setLastDocument] = useState(PAGE_START);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sessionMode, setSessionMode] = useState<SessionMode | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [page, nextCategories] = await Promise.all([
        getDiscoverPage(PAGE_START),
        getSkillCategories(),
      ]);
      setStudents(page.students);
      setCategories(nextCategories);
      setLastDocument(page.lastDocument);
      setHasMore(page.hasMore);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Students could not be loaded.";
      console.error("Failed to load skill discovery.", loadError);
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
        setStudents([]);
        setError("Sign in to discover student portfolios.");
        setIsLoading(false);
        return;
      }
      void loadFirstPage();
    }, [isAuthLoading, loadFirstPage, user?.uid]),
  );

  const filteredStudents = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase();
    const universityTerm = universityFilter.trim().toLocaleLowerCase();
    const availabilityTerm = availabilityFilter.trim().toLocaleLowerCase();

    return students.filter((student) => {
      const searchableStudentText = [
        student.displayName,
        student.bio,
        student.location,
        student.universityId,
        student.university,
        student.faculty,
        student.course,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      const studentSkills = student.skills.filter((skill) => {
        const searchableSkillText =
          `${skill.skillName} ${skill.description ?? ""}`.toLocaleLowerCase();
        return (
          (!searchTerm ||
            searchableSkillText.includes(searchTerm) ||
            searchableStudentText.includes(searchTerm)) &&
          (!categoryId || skill.categoryId === categoryId) &&
          (sessionMode === "ALL" || skill.sessionModes.includes(sessionMode)) &&
          (!availabilityTerm ||
            skill.availability?.toLocaleLowerCase().includes(availabilityTerm))
        );
      });

      return (
        studentSkills.length > 0 &&
        (!universityTerm ||
          student.university?.toLocaleLowerCase().includes(universityTerm) ||
          student.universityId?.toLocaleLowerCase().includes(universityTerm))
      );
    });
  }, [
    availabilityFilter,
    categoryId,
    search,
    sessionMode,
    students,
    universityFilter,
  ]);

  async function loadMore() {
    if (!lastDocument || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const page: DiscoverPage = await getDiscoverPage(lastDocument);
      setStudents((current) => {
        const merged = new Map(
          current.map((student) => [
            student.userId,
            { ...student, skills: [...student.skills] },
          ]),
        );
        page.students.forEach((student) => {
          const existingStudent = merged.get(student.userId);
          if (existingStudent) {
            const existingSkillIds = new Set(
              existingStudent.skills.map((skill) => skill.id),
            );
            merged.set(student.userId, {
              ...existingStudent,
              skills: [
                ...existingStudent.skills,
                ...student.skills.filter((skill) => !existingSkillIds.has(skill.id)),
              ],
            });
          } else {
            merged.set(student.userId, { ...student, skills: [...student.skills] });
          }
        });
        return [...merged.values()].sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        );
      });
      setLastDocument(page.lastDocument);
      setHasMore(page.hasMore);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "More students could not be loaded.";
      console.error("Failed to load more skill profiles.", loadError);
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function openStudent(student: StudentDirectoryProfile) {
    router.push({
      pathname: "/students/[userId]",
      params: { userId: student.userId },
    } as Href);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="compass-outline" size={23} color={m5Colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>SKILL DISCOVERY</Text>
            <Text style={styles.title}>Find your people</Text>
            <Text style={styles.subtitle}>
              Search student portfolios and discover skills to exchange.
            </Text>
          </View>
        </View>

        <Card style={styles.filtersCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={19} color={m5Colors.textMuted} />
            <TextInput
              accessibilityLabel="Search students and skills"
              onChangeText={setSearch}
              placeholder="Search students, skills, or location"
              returnKeyType="search"
              style={styles.searchInput}
              value={search}
            />
            {search ? (
              <Pressable
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                onPress={() => setSearch("")}
              >
                <Ionicons name="close-circle" size={19} color={m5Colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.filterLabel}>Skill category</Text>
          <ScrollView
            contentContainerStyle={styles.filterChips}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Chip
              label="All"
              selected={!categoryId}
              onPress={() => setCategoryId("")}
            />
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                selected={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Session format</Text>
          <View style={styles.filterChips}>
            <Chip
              label="Any"
              selected={sessionMode === "ALL"}
              onPress={() => setSessionMode("ALL")}
            />
            <Chip
              label="Online"
              selected={sessionMode === "ONLINE"}
              onPress={() => setSessionMode("ONLINE")}
            />
            <Chip
              label="In person"
              selected={sessionMode === "IN_PERSON"}
              onPress={() => setSessionMode("IN_PERSON")}
            />
          </View>

          <View style={styles.secondaryFilters}>
            <TextInput
              accessibilityLabel="Filter by university"
              onChangeText={setUniversityFilter}
              placeholder="University"
              style={[styles.filterInput, styles.halfInput]}
              value={universityFilter}
            />
            <TextInput
              accessibilityLabel="Filter by availability"
              onChangeText={setAvailabilityFilter}
              placeholder="Availability"
              style={[styles.filterInput, styles.halfInput]}
              value={availabilityFilter}
            />
          </View>
        </Card>

        <View style={styles.resultsHeading}>
          <Text style={styles.resultsTitle}>Students</Text>
          {!isLoading ? (
            <Text style={styles.resultsCount}>
              {filteredStudents.length} shown
            </Text>
          ) : null}
        </View>

        {isLoading ? (
          <LoadingState label="Finding student portfolios..." />
        ) : error && students.length === 0 ? (
          <ErrorState message={error} onRetry={() => void loadFirstPage()} />
        ) : filteredStudents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="search-outline"
              title={students.length ? "No matching students" : "No portfolios yet"}
              message={
                students.length
                  ? "Try broadening your search or clearing one of the filters."
                  : "When students add skills they can offer, their profiles will appear here."
              }
              action={
                students.length ? (
                  <Button
                    label="Clear filters"
                    variant="soft"
                    onPress={() => {
                      setSearch("");
                      setUniversityFilter("");
                      setAvailabilityFilter("");
                      setCategoryId("");
                      setSessionMode("ALL");
                    }}
                  />
                ) : undefined
              }
            />
          </Card>
        ) : (
          <View style={styles.studentList}>
            {filteredStudents.map((student) => (
              <Pressable
                accessibilityRole="button"
                key={student.userId}
                onPress={() => openStudent(student)}
                style={({ pressed }) => pressed && styles.studentPressed}
              >
                <Card style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <Avatar
                      name={student.displayName}
                      size={50}
                      uri={student.profilePhotoUrl}
                    />
                    <View style={styles.studentHeading}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {student.displayName}
                      </Text>
                      <Text style={styles.studentMeta} numberOfLines={1}>
                        {[student.university, student.location]
                          .filter(Boolean)
                          .join(" · ") || "LearnLink student"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={m5Colors.textMuted}
                    />
                  </View>

                  {student.ratingAverage !== undefined ? (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={15} color={m5Colors.star} />
                      <Text style={styles.ratingText}>
                        {student.ratingAverage.toFixed(1)}
                        {student.ratingCount
                          ? ` · ${student.ratingCount} reviews`
                          : ""}
                      </Text>
                    </View>
                  ) : null}
                  {student.bio ? (
                    <Text style={styles.bio} numberOfLines={2}>
                      {student.bio}
                    </Text>
                  ) : null}
                  <Text style={styles.offerLabel}>Can teach</Text>
                  <View style={styles.skillChips}>
                    {student.skills.slice(0, 4).map((skill) => (
                      <Chip key={skill.id} label={skill.skillName} tone="mint" />
                    ))}
                    {student.skills.length > 4 ? (
                      <Chip
                        label={`+${student.skills.length - 4}`}
                        tone="neutral"
                      />
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {error && students.length > 0 ? (
          <Text style={styles.loadMoreError}>{error}</Text>
        ) : null}
        {hasMore ? (
          <Button
            label="Load more students"
            icon="chevron-down"
            loading={isLoadingMore}
            onPress={() => void loadMore()}
            variant="soft"
            style={styles.loadMoreButton}
          />
        ) : null}
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
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 13,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: m5Colors.primarySoft,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: m5Colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    color: m5Colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
  },
  subtitle: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  filtersCard: {
    gap: 12,
    padding: 14,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: m5Colors.background,
    borderColor: m5Colors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: m5Colors.textPrimary,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
  },
  filterLabel: {
    color: m5Colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  filterChips: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryFilters: {
    flexDirection: "row",
    gap: 9,
  },
  filterInput: {
    backgroundColor: m5Colors.background,
    borderColor: m5Colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: m5Colors.textPrimary,
    fontSize: 13,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  halfInput: {
    flex: 1,
    minWidth: 0,
  },
  resultsHeading: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  resultsTitle: {
    color: m5Colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  resultsCount: {
    color: m5Colors.textMuted,
    fontSize: 12,
  },
  emptyCard: {
    minHeight: 220,
    justifyContent: "center",
  },
  studentList: {
    gap: 12,
  },
  studentPressed: {
    opacity: 0.8,
  },
  studentCard: {
    gap: 11,
    padding: 15,
  },
  studentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  studentHeading: {
    flex: 1,
  },
  studentName: {
    color: m5Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  studentMeta: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  ratingText: {
    color: m5Colors.textSecondary,
    fontSize: 12,
  },
  bio: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  offerLabel: {
    color: m5Colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  skillChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  loadMoreButton: {
    marginTop: 2,
  },
  loadMoreError: {
    color: m5Colors.error,
    fontSize: 13,
    textAlign: "center",
  },
});
