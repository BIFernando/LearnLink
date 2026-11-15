import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Button,
  Card,
  Chip,
  ErrorState,
  LoadingState,
} from "@/components/member5/ui";
import { m5Colors } from "@/constants/member5Theme";
import {
  getMySkills,
  getSkillCatalog,
  getSkillCategories,
  saveUserSkill,
  suggestSkill,
} from "@/services/member2/skillService";
import {
  SESSION_MODES,
  SKILL_LEVELS,
  SKILL_TYPES,
  type SessionMode,
  type SkillCatalogItem,
  type SkillCategory,
  type SkillLevel,
  type SkillType,
  type StudentSkill,
} from "@/types/member2/skills";

const levelLabels: Record<SkillLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export default function SkillFormScreen() {
  const router = useRouter();
  const { userSkillId } = useLocalSearchParams<{ userSkillId?: string }>();
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skill, setSkill] = useState<StudentSkill | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [type, setType] = useState<SkillType>("OFFER");
  const [level, setLevel] = useState<SkillLevel>("BEGINNER");
  const [description, setDescription] = useState("");
  const [yearsExperience, setYearsExperience] = useState("0");
  const [sessionModes, setSessionModes] = useState<SessionMode[]>(["ONLINE"]);
  const [availability, setAvailability] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionVisible, setSuggestionVisible] = useState(false);
  const [suggestionName, setSuggestionName] = useState("");
  const [suggestionCategoryId, setSuggestionCategoryId] = useState("");
  const [suggestionDescription, setSuggestionDescription] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);

  const loadForm = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextCatalog, nextCategories, mySkills] = await Promise.all([
        getSkillCatalog(),
        getSkillCategories(),
        getMySkills(),
      ]);
      setCatalog(nextCatalog);
      setCategories(nextCategories);

      if (userSkillId) {
        const existingSkill = mySkills.find((entry) => entry.id === userSkillId);
        if (!existingSkill) {
          throw new Error("This skill is not in your portfolio or no longer exists.");
        }
        setSkill(existingSkill);
        setSelectedSkillId(existingSkill.skillId);
        setType(existingSkill.type);
        setLevel(existingSkill.proficiencyLevel);
        setDescription(existingSkill.description ?? "");
        setYearsExperience(String(existingSkill.yearsExperience ?? 0));
        setSessionModes(existingSkill.sessionModes);
        setAvailability(existingSkill.availability ?? "");
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "The skill form could not be loaded.";
      console.error("Failed to load the skill form.", loadError);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userSkillId]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  const filteredCatalog = useMemo(() => {
    const search = skillSearch.trim().toLocaleLowerCase();
    return catalog.filter(
      (item) =>
        !search ||
        item.name.toLocaleLowerCase().includes(search) ||
        item.description?.toLocaleLowerCase().includes(search),
    );
  }, [catalog, skillSearch]);

  const selectedSkill = catalog.find((item) => item.id === selectedSkillId);

  function toggleSessionMode(mode: SessionMode) {
    setSessionModes((current) =>
      current.includes(mode)
        ? current.filter((value) => value !== mode)
        : [...current, mode],
    );
  }

  async function handleSave() {
    const years = Number(yearsExperience);
    if (!selectedSkillId) {
      setError("Choose a skill from the catalog before saving.");
      return;
    }
    if (!Number.isInteger(years) || years < 0 || years > 50) {
      setError("Years of experience must be a whole number between 0 and 50.");
      return;
    }
    if (sessionModes.length === 0) {
      setError("Choose at least one session format.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveUserSkill(
        {
          skillId: selectedSkillId,
          type,
          proficiencyLevel: level,
          description,
          yearsExperience: years,
          sessionModes,
          availability,
        },
        skill?.id,
      );
      Alert.alert(
        "Saved",
        skill ? "Your skill was updated." : "Your skill was added to the portfolio.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Your skill could not be saved.";
      console.error("Failed to save a portfolio skill.", saveError);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuggestion() {
    setIsSuggesting(true);
    setError(null);
    try {
      await suggestSkill({
        name: suggestionName,
        categoryId: suggestionCategoryId,
        description: suggestionDescription,
      });
      setSuggestionVisible(false);
      setSuggestionName("");
      setSuggestionCategoryId("");
      setSuggestionDescription("");
      Alert.alert(
        "Suggestion sent",
        "A catalog administrator will review your skill suggestion.",
      );
    } catch (suggestionError) {
      const message =
        suggestionError instanceof Error
          ? suggestionError.message
          : "Your skill suggestion could not be sent.";
      console.error("Failed to submit a skill suggestion.", suggestionError);
      setError(message);
    } finally {
      setIsSuggesting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <LoadingState label="Loading skill details..." />
      </SafeAreaView>
    );
  }

  if (error && catalog.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ErrorState message={error} onRetry={() => void loadForm()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>SKILL PORTFOLIO</Text>
        <Text style={styles.title}>{skill ? "Edit skill" : "Add a skill"}</Text>
        <Text style={styles.subtitle}>
          Share what you can teach or what you are interested in learning.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={m5Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Card style={styles.formCard}>
          <Text style={styles.label}>I want to…</Text>
          <View style={styles.choiceRow}>
            {SKILL_TYPES.map((value) => (
              <Chip
                key={value}
                label={value === "OFFER" ? "Teach this skill" : "Learn this skill"}
                selected={type === value}
                onPress={() => setType(value)}
              />
            ))}
          </View>

          <Text style={styles.label}>Choose a catalog skill</Text>
          <TextInput
            accessibilityLabel="Search catalog skills"
            onChangeText={setSkillSearch}
            placeholder="Search skills"
            style={styles.input}
            value={skillSearch}
          />
          {selectedSkill ? (
            <View style={styles.selectedSkill}>
              <Text style={styles.selectedSkillText}>{selectedSkill.name}</Text>
              <Pressable
                accessibilityLabel="Clear selected skill"
                accessibilityRole="button"
                onPress={() => setSelectedSkillId("")}
              >
                <Ionicons name="close-circle" size={20} color={m5Colors.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.catalogList}>
            {filteredCatalog.slice(0, 40).map((item) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === selectedSkillId }}
                key={item.id}
                onPress={() => setSelectedSkillId(item.id)}
                style={({ pressed }) => [
                  styles.catalogRow,
                  item.id === selectedSkillId && styles.catalogRowSelected,
                  pressed && styles.catalogRowPressed,
                ]}
              >
                <View style={styles.catalogText}>
                  <Text style={styles.catalogName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.catalogDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={item.id === selectedSkillId ? "checkmark-circle" : "add-circle-outline"}
                  size={21}
                  color={item.id === selectedSkillId ? m5Colors.primary : m5Colors.textMuted}
                />
              </Pressable>
            ))}
            {filteredCatalog.length === 0 ? (
              <Text style={styles.emptyCatalog}>No catalog skills match your search.</Text>
            ) : null}
          </View>
          {filteredCatalog.length > 40 ? (
            <Text style={styles.catalogHint}>
              Showing the first 40 results. Search to narrow the list.
            </Text>
          ) : null}
          <Button
            label="Suggest a new skill"
            icon="bulb-outline"
            onPress={() => {
              setSuggestionName(skillSearch.trim());
              setSuggestionVisible(true);
            }}
            variant="soft"
            style={styles.suggestButton}
          />

          <Text style={styles.label}>
            {type === "OFFER" ? "Your proficiency" : "Your target level"}
          </Text>
          <View style={styles.choiceRow}>
            {SKILL_LEVELS.map((value) => (
              <Chip
                key={value}
                label={levelLabels[value]}
                selected={level === value}
                onPress={() => setLevel(value)}
              />
            ))}
          </View>

          <Text style={styles.label}>Experience (years)</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setYearsExperience}
            placeholder="0"
            style={styles.input}
            value={yearsExperience}
          />

          <Text style={styles.label}>Session formats</Text>
          <View style={styles.choiceRow}>
            {SESSION_MODES.map((mode) => (
              <Chip
                key={mode}
                label={mode === "ONLINE" ? "Online" : "In person"}
                selected={sessionModes.includes(mode)}
                onPress={() => toggleSessionMode(mode)}
              />
            ))}
          </View>

          <Text style={styles.label}>Availability</Text>
          <TextInput
            maxLength={200}
            onChangeText={setAvailability}
            placeholder="e.g. Weekday evenings"
            style={styles.input}
            value={availability}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            maxLength={500}
            multiline
            onChangeText={setDescription}
            placeholder={
              type === "OFFER"
                ? "What can students expect to learn from you?"
                : "What are you hoping to learn?"
            }
            style={[styles.input, styles.multilineInput]}
            textAlignVertical="top"
            value={description}
          />

          <Button
            label={skill ? "Save changes" : "Add to My Skills"}
            icon="checkmark"
            loading={isSaving}
            onPress={() => void handleSave()}
            style={styles.saveButton}
          />
        </Card>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSuggestionVisible(false)}
        transparent
        visible={suggestionVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Suggest a catalog skill</Text>
              <Pressable
                accessibilityLabel="Close skill suggestion"
                accessibilityRole="button"
                onPress={() => setSuggestionVisible(false)}
              >
                <Ionicons name="close" size={24} color={m5Colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>
              Suggestions are reviewed before they are added to the shared catalog.
            </Text>
            <Text style={styles.label}>Skill name</Text>
            <TextInput
              maxLength={100}
              onChangeText={setSuggestionName}
              placeholder="e.g. Motion graphics"
              style={styles.input}
              value={suggestionName}
            />
            <Text style={styles.label}>Category (optional)</Text>
            <ScrollView
              contentContainerStyle={styles.choiceRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <Chip
                label="No category"
                selected={!suggestionCategoryId}
                onPress={() => setSuggestionCategoryId("")}
              />
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  selected={suggestionCategoryId === category.id}
                  onPress={() => setSuggestionCategoryId(category.id)}
                />
              ))}
            </ScrollView>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              maxLength={500}
              multiline
              onChangeText={setSuggestionDescription}
              placeholder="Describe this skill"
              style={[styles.input, styles.multilineInput]}
              textAlignVertical="top"
              value={suggestionDescription}
            />
            <Button
              label="Send suggestion"
              icon="send-outline"
              loading={isSuggesting}
              onPress={() => void handleSuggestion()}
              style={styles.saveButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: m5Colors.background,
    flex: 1,
  },
  content: {
    gap: 12,
    padding: 18,
    paddingBottom: 32,
  },
  eyebrow: {
    color: m5Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: m5Colors.textPrimary,
    fontSize: 27,
    fontWeight: "800",
    marginTop: -7,
  },
  subtitle: {
    color: m5Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -7,
  },
  formCard: {
    gap: 12,
    marginTop: 5,
    padding: 16,
  },
  label: {
    color: m5Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
  choiceRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  input: {
    backgroundColor: m5Colors.background,
    borderColor: m5Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: m5Colors.textPrimary,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  catalogList: {
    borderColor: m5Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 225,
    overflow: "hidden",
  },
  catalogRow: {
    alignItems: "center",
    borderBottomColor: m5Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catalogRowSelected: {
    backgroundColor: m5Colors.primarySoft,
  },
  catalogRowPressed: {
    opacity: 0.75,
  },
  catalogText: {
    flex: 1,
  },
  catalogName: {
    color: m5Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  catalogDescription: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  emptyCatalog: {
    color: m5Colors.textMuted,
    padding: 12,
  },
  catalogHint: {
    color: m5Colors.textMuted,
    fontSize: 12,
  },
  selectedSkill: {
    alignItems: "center",
    backgroundColor: m5Colors.primarySoft,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectedSkillText: {
    color: m5Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  suggestButton: {
    alignSelf: "flex-start",
    minHeight: 40,
  },
  multilineInput: {
    minHeight: 94,
  },
  saveButton: {
    marginTop: 7,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: m5Colors.errorSoft,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  errorText: {
    color: m5Colors.error,
    flex: 1,
    fontSize: 13,
  },
  modalBackdrop: {
    backgroundColor: "rgba(16, 20, 40, 0.48)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: m5Colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 10,
    maxHeight: "90%",
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: m5Colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  modalHint: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
