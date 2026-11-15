import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconBubble,
  LoadingState,
} from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { getChallenge, submitChallengeAttempt } from "@/services/member5/challengeService";
import { errorMessage } from "@/services/member5/format";
import type { Challenge, SubmitChallengeAttemptResponse } from "@/types/member5";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function ChallengePlayScreen() {
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<SubmitChallengeAttemptResponse | null>(null);

  const load = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    setError("");
    try {
      const found = await getChallenge(challengeId);
      setChallenge(found);
      setAnswers(found ? found.questions.map(() => -1) : []);
    } catch (err) {
      setError(errorMessage(err, "Failed to load this challenge."));
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!challenge || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      setResult(await submitChallengeAttempt({ challengeId: challenge.challengeId, answers }));
    } catch (err) {
      setSubmitError(errorMessage(err, "Could not submit your answers. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!challenge || !challenge.isActive || challenge.questions.length === 0) {
    return <EmptyState icon="flash-off-outline" title="Challenge unavailable" message="This challenge is not active." />;
  }

  // ============ Results: per-question review ============
  if (result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.center}>
          <IconBubble icon={result.score >= 60 ? "trophy" : "school"} bg={colors.peach} fg={colors.amber} size={56} />
          <Text style={styles.scoreTitle}>{result.score}%</Text>
          <Text style={styles.muted}>
            {result.correctCount} of {result.totalQuestions} correct
          </Text>
        </Card>

        <View style={styles.xpCard}>
          <IconBubble icon="ribbon" bg={colors.amber} fg={colors.white} />
          <View style={{ flex: 1 }}>
            <Text style={styles.xpTitle}>+{result.xpEarned} XP</Text>
            <Text style={styles.xpText}>
              {result.isFirstAttempt
                ? "Earned! Added to your progress."
                : "Practice round. XP is only awarded on your first attempt."}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Review your answers</Text>
        {challenge.questions.map((question, qIndex) => {
          const review = result.results[qIndex];
          if (!review) return null;
          return (
            <Card key={qIndex} style={{ gap: 8 }}>
              <View style={styles.reviewHeader}>
                <Ionicons
                  name={review.isCorrect ? "checkmark-circle" : "close-circle"}
                  size={22}
                  color={review.isCorrect ? colors.teal : colors.error}
                />
                <Text style={styles.reviewQuestion}>
                  Q{qIndex + 1}. {question.question}
                </Text>
              </View>
              {!review.isCorrect ? (
                <Text style={styles.muted}>
                  Your answer:{" "}
                  {review.selectedIndex >= 0 ? question.options[review.selectedIndex] : "No answer"}
                </Text>
              ) : null}
              <Text style={[styles.muted, { color: colors.teal, fontWeight: "700" }]}>
                Correct: {question.options[review.correctIndex]}
              </Text>
              {review.explanation ? <Text style={styles.explanation}>{review.explanation}</Text> : null}
            </Card>
          );
        })}

        <Button label="Back to Challenges" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  // ============ Play ============
  const question = challenge.questions[index];
  const total = challenge.questions.length;
  const isLast = index === total - 1;
  const answeredCount = answers.filter((answer) => answer >= 0).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.muted}>{challenge.category}</Text>
        </View>
        <Chip label={`+${challenge.xpReward} XP Reward`} tone="peach" icon="ribbon-outline" />
      </View>

      <Card style={{ gap: 10 }}>
        <View style={styles.reviewHeader}>
          <Text style={styles.progressTitle}>
            Question {index + 1} of {total}
          </Text>
          <Text style={styles.muted}>{answeredCount} answered</Text>
        </View>
        <View style={styles.segments}>
          {challenge.questions.map((_, qIndex) => (
            <View
              key={qIndex}
              style={[
                styles.segment,
                qIndex === index
                  ? { backgroundColor: colors.amber }
                  : answers[qIndex] >= 0
                    ? { backgroundColor: colors.primary }
                    : null,
              ]}
            />
          ))}
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={styles.questionRow}>
          <View style={styles.qBadge}>
            <Text style={styles.qBadgeText}>Q{index + 1}</Text>
          </View>
          <Text style={styles.question}>{question.question}</Text>
        </View>
        {question.options.map((option, optionIndex) => {
          const selected = answers[index] === optionIndex;
          return (
            <Pressable
              key={optionIndex}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() =>
                setAnswers((current) => current.map((value, i) => (i === index ? optionIndex : value)))
              }
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={[styles.letter, selected && { backgroundColor: colors.primary }]}>
                <Text style={[styles.letterText, selected && { color: colors.white }]}>{LETTERS[optionIndex]}</Text>
              </View>
              <Text style={[styles.optionText, selected && { fontWeight: "700" }]}>{option}</Text>
              <Ionicons
                name={selected ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={selected ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </Card>

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

      <View style={styles.navRow}>
        {index > 0 ? (
          <Button label="Back" variant="soft" onPress={() => setIndex(index - 1)} style={{ flex: 1 }} />
        ) : null}
        {isLast ? (
          <Button
            label="Submit Answers"
            icon="checkmark-done"
            onPress={handleSubmit}
            loading={submitting}
            disabled={answers[index] < 0}
            style={{ flex: 2 }}
          />
        ) : (
          <Button
            label={`Next Question (${index + 2}/${total})`}
            icon="arrow-forward"
            onPress={() => setIndex(index + 1)}
            disabled={answers[index] < 0}
            style={{ flex: 2 }}
          />
        )}
      </View>
      <Text style={[styles.muted, { textAlign: "center" }]}>
        Answers are checked when you submit, then you&apos;ll see a full review.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  muted: { fontSize: 14, color: colors.textSecondary },
  progressTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  segments: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.primarySoft },
  questionRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  qBadge: { backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  qBadgeText: { color: colors.primary, fontWeight: "800" },
  question: { flex: 1, fontSize: 19, fontWeight: "700", lineHeight: 26, color: colors.textPrimary },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: { fontWeight: "800", color: colors.textSecondary },
  optionText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  navRow: { flexDirection: "row", gap: 10 },
  error: { color: colors.error, textAlign: "center" },
  center: { alignItems: "center", gap: 6 },
  scoreTitle: { fontSize: 44, fontWeight: "800", color: colors.textPrimary },
  xpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.peach,
  },
  xpTitle: { fontSize: 26, fontWeight: "800", color: colors.amber },
  xpText: { fontSize: 13, color: colors.amber },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewQuestion: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  explanation: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    backgroundColor: colors.mintSoft,
    padding: 10,
    borderRadius: 10,
  },
});
