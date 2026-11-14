import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, EmptyState, ErrorState, IconBubble, LoadingState, ProgressBar } from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { LEADERBOARD_SIZE } from "@/functions/src/member5/xpRules";
import { useAuth } from "@/providers/AuthProvider";
import { errorMessage, formatXp } from "@/services/member5/format";
import { getLeaderboard, getMyRank } from "@/services/member5/gamificationService";
import { displayNameOf, useLiveUser } from "@/services/member5/userService";
import type { GamifiedUser } from "@/types/member5";

const PERIODS = ["Weekly", "Monthly", "All Time"] as const;

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const userId = authUser?.uid;
  const { user: me } = useLiveUser(userId);
  const [leaders, setLeaders] = useState<GamifiedUser[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLeaders(await getLeaderboard());
    } catch (err) {
      setError(errorMessage(err, "Failed to load the leaderboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const myXp = me?.xp ?? 0;
  useEffect(() => {
    if (!userId) return;
    const index = leaders.findIndex((leader) => leader.userId === userId);
    if (index >= 0) {
      setMyRank(index + 1);
      return;
    }
    let active = true;
    getMyRank(myXp)
      .then((rank) => active && setMyRank(rank))
      .catch(() => active && setMyRank(null));
    return () => {
      active = false;
    };
  }, [leaders, userId, myXp]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (leaders.length === 0) {
    return (
      <EmptyState
        icon="podium-outline"
        title="No rankings yet"
        message="Complete sessions and challenges to be the first on the board."
      />
    );
  }

  const podium = [leaders[1], leaders[0], leaders[2]];
  const rest = leaders.slice(3);
  const above = myRank && myRank > 1 ? leaders[myRank - 2] : undefined;
  const gap = above ? Math.max(0, (above.xp ?? 0) - myXp) : 0;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={rest}
      keyExtractor={(item) => item.userId}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 4 }}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Leaderboard</Text>
              <Text style={styles.subtitle}>● All-time XP • Top {LEADERBOARD_SIZE}</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            {PERIODS.map((period) => {
              const active = period === "All Time";
              return (
                <View
                  key={period}
                  style={[styles.tab, active && styles.tabActive]}
                  accessibilityState={{ disabled: !active, selected: active }}
                >
                  <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextDisabled]}>
                    {period}
                  </Text>
                  {!active ? <Text style={styles.soon}>Soon</Text> : null}
                </View>
              );
            })}
          </View>

          <View style={styles.podium}>
            {podium.map((leader, slot) => {
              if (!leader) return <View key={`empty-${slot}`} style={{ flex: 1 }} />;
              const rank = slot === 1 ? 1 : slot === 0 ? 2 : 3;
              return (
                <View key={leader.userId} style={styles.podiumSlot}>
                  {rank === 1 ? <Ionicons name="trophy" size={22} color={colors.amber} /> : null}
                  <Avatar uri={leader.profilePhotoUrl} name={displayNameOf(leader)} size={rank === 1 ? 76 : 56} />
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {displayNameOf(leader)}
                  </Text>
                  <Text style={styles.podiumXp}>⚡ {formatXp(leader.xp ?? 0)} XP</Text>
                  <View style={[styles.step, { height: rank === 1 ? 90 : rank === 2 ? 64 : 48 }, rank === 1 && styles.stepLeader]}>
                    <Text style={[styles.stepText, rank === 1 && { color: colors.white }]}>
                      {rank === 1 ? "LEADER" : `#${rank}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {userId && myRank ? (
            <View style={styles.meCard}>
              <View style={styles.meRow}>
                <View style={styles.meRank}>
                  <Text style={styles.meRankText}>#{myRank}</Text>
                </View>
                <Text style={styles.meName}>You ({displayNameOf(me)})</Text>
                <Text style={styles.meXp}>{formatXp(myXp)} XP</Text>
              </View>
              {above ? (
                <>
                  <View style={styles.meRow}>
                    <Text style={styles.small}>
                      Gap to Rank #{myRank - 1} ({displayNameOf(above)})
                    </Text>
                    <Text style={[styles.small, { color: colors.primary, fontWeight: "700" }]}>
                      {formatXp(gap)} XP needed
                    </Text>
                  </View>
                  <ProgressBar progress={above.xp ? myXp / above.xp : 0} track={colors.white} />
                </>
              ) : (
                <Text style={styles.small}>You&apos;re at the top. Keep it up!</Text>
              )}
            </View>
          ) : null}

          {rest.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.caps}>RANK • STUDENT</Text>
              <Text style={styles.caps}>SCORE</Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item, index }) => {
        const rank = index + 4;
        const isMe = item.userId === userId;
        return (
          <View style={[styles.row, isMe && styles.rowMe]}>
            <Text style={styles.rank}>{rank}</Text>
            <Avatar uri={item.profilePhotoUrl} name={displayNameOf(item)} size={40} />
            <Text style={[styles.rowName, isMe && { color: colors.primary }]} numberOfLines={1}>
              {displayNameOf(item)}
              {isMe ? " (You)" : ""}
            </Text>
            <Text style={[styles.rowXp, isMe && { color: colors.primary }]}>{formatXp(item.xp ?? 0)} XP</Text>
          </View>
        );
      }}
      ListFooterComponent={
        <Pressable style={styles.cta} onPress={() => router.push("/member3/MatchesScreen")}>
          <IconBubble icon="swap-vertical" bg={colors.white} fg={colors.teal} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Swap a peer session</Text>
            <Text style={styles.ctaText}>Each completed session earns XP for both of you.</Text>
          </View>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  titleRow: { flexDirection: "row", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.teal },
  tabs: { flexDirection: "row", backgroundColor: colors.primarySoft, borderRadius: 16, padding: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: "700" },
  tabTextActive: { color: colors.white },
  tabTextDisabled: { color: colors.textMuted },
  soon: { fontSize: 10, color: colors.textMuted },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#F0F0FA",
  },
  podiumSlot: { flex: 1, alignItems: "center", gap: 4 },
  podiumName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  podiumXp: { fontSize: 13, fontWeight: "600", color: colors.primary },
  step: {
    alignSelf: "stretch",
    marginTop: 6,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLeader: { backgroundColor: colors.primary },
  stepText: { fontSize: 13, fontWeight: "800", color: colors.textSecondary, letterSpacing: 0.8 },
  meCard: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 16, gap: 10 },
  meRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  meRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  meRankText: { color: colors.white, fontWeight: "800" },
  meName: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  meXp: { fontSize: 18, fontWeight: "800", color: colors.primary },
  small: { fontSize: 13, color: colors.textSecondary },
  listHeader: { flexDirection: "row", justifyContent: "space-between" },
  caps: { fontSize: 13, fontWeight: "700", letterSpacing: 0.6, color: colors.textSecondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  rowMe: { backgroundColor: colors.primarySoft },
  rank: { width: 24, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  rowName: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  rowXp: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.mint,
  },
  ctaTitle: { fontSize: 16, fontWeight: "800", color: "#08433D" },
  ctaText: { fontSize: 13, color: "#08433D" },
});
