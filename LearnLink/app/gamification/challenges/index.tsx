import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Chip, EmptyState, ErrorState, IconBubble, LoadingState } from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import { getActiveChallenges, getMyAttempts } from "@/services/member5/challengeService";
import { errorMessage } from "@/services/member5/format";
import type { Challenge, ChallengeAttempt, ChallengeDifficulty } from "@/types/member5";

const DIFFICULTY_TONE: Record<ChallengeDifficulty, "mint" | "primary" | "peach"> = {
  EASY: "mint",
  MEDIUM: "primary",
  HARD: "peach",
};

export default function ChallengesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [attempts, setAttempts] = useState<ChallengeAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const [active, mine] = await Promise.all([getActiveChallenges(), getMyAttempts(userId)]);
      setChallenges(active);
      setAttempts(mine);
    } catch (err) {
      setError(errorMessage(err, "Failed to load challenges."));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const bestScore = useMemo(() => {
    const best = new Map<string, number>();
    attempts.forEach((attempt) =>
      best.set(attempt.challengeId, Math.max(best.get(attempt.challengeId) ?? 0, attempt.score)),
    );
    return best;
  }, [attempts]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (challenges.length === 0) {
    return (
      <EmptyState
        icon="flash-outline"
        title="No challenges right now"
        message="New skill trivia challenges will appear here. Check back soon!"
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={challenges}
      keyExtractor={(item) => item.challengeId}
      ListHeaderComponent={
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.title}>Skill Challenges</Text>
          <Text style={styles.subtitle}>
            Answer trivia to earn bonus XP. XP is awarded on your first attempt.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const best = bestScore.get(item.challengeId);
        return (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/gamification/challenges/[challengeId]",
                params: { challengeId: item.challengeId },
              })
            }
          >
            <IconBubble icon="flash" bg={colors.peach} fg={colors.amber} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardText} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.chips}>
                <Chip label={item.category} tone="neutral" />
                <Chip label={item.difficulty} tone={DIFFICULTY_TONE[item.difficulty]} />
                <Chip label={`${item.questions.length} Qs`} tone="neutral" />
              </View>
            </View>
            <View style={styles.reward}>
              {best !== undefined ? (
                <>
                  <Text style={styles.done}>Best {best}%</Text>
                  <Text style={styles.small}>Play again</Text>
                </>
              ) : (
                <Text style={styles.xp}>+{item.xpReward} XP</Text>
              )}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  cardText: { fontSize: 13, color: colors.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reward: { alignItems: "flex-end", gap: 2 },
  xp: { fontSize: 15, fontWeight: "800", color: colors.amber },
  done: { fontSize: 14, fontWeight: "800", color: colors.teal },
  small: { fontSize: 12, color: colors.textSecondary },
});
