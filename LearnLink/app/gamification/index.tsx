import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconBubble,
  LoadingState,
  ProgressBar,
  type IoniconName,
} from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { levelProgress, streakBonus } from "@/functions/src/member5/xpRules";
import { useAuth } from "@/providers/AuthProvider";
import { errorMessage, formatListTime, formatXp } from "@/services/member5/format";
import {
  XP_REASON_LABELS,
  lastSevenDays,
  subscribeToXpTransactions,
} from "@/services/member5/gamificationService";
import { displayNameOf, useLiveUser } from "@/services/member5/userService";
import type { XpReason, XpTransaction } from "@/types/member5";

const REASON_ICONS: Record<XpReason, IoniconName> = {
  SESSION_COMPLETED: "swap-horizontal",
  REVIEW_GIVEN: "star",
  CHALLENGE_COMPLETED: "flash",
  BADGE_EARNED: "ribbon",
  STREAK_BONUS: "flame",
};

const HUB_LINKS: { label: string; icon: IoniconName; href: Href }[] = [
  { label: "Badges", icon: "ribbon-outline", href: "/gamification/badges" },
  { label: "Challenges", icon: "flash-outline", href: "/gamification/challenges" },
  { label: "Leaderboard", icon: "podium-outline", href: "/gamification/leaderboard" },
];

const CHART_HEIGHT = 120;

export default function ProgressScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const userId = authUser?.uid;
  const { user, loading: userLoading, error: userError } = useLiveUser(userId);
  const [transactions, setTransactions] = useState<XpTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!userId) {
      setTxLoading(false);
      return;
    }
    setTxLoading(true);
    return subscribeToXpTransactions(
      userId,
      50,
      (items) => {
        setTransactions(items);
        setTxError("");
        setTxLoading(false);
      },
      (err) => {
        setTxError(errorMessage(err, "Failed to load XP activity."));
        setTxLoading(false);
      },
    );
  }, [userId, retryKey]);

  const week = useMemo(() => lastSevenDays(transactions), [transactions]);

  if (userLoading || txLoading) return <LoadingState />;
  if (!userId) return <EmptyState icon="lock-closed-outline" title="Sign in to see your progress" />;
  if (userError || txError) {
    return <ErrorState message={userError ?? txError} onRetry={() => setRetryKey((key) => key + 1)} />;
  }

  const xp = user?.xp ?? 0;
  const streak = user?.streak ?? 0;
  const progress = levelProgress(xp);
  const name = displayNameOf(user);
  const weeklyGain = week.reduce((sum, day) => sum + day.xp, 0);
  const topDay = week.reduce((best, day) => (day.xp > best.xp ? day : best), week[0]);
  const maxXp = Math.max(1, ...week.map((day) => day.xp));
  const shownDay = week.find((day) => day.key === selectedDay) ?? (topDay.xp > 0 ? topDay : null);
  const bonus = streakBonus(streak);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={{ gap: 16 }}>
        <View style={styles.profileRow}>
          <Avatar uri={user?.profilePhotoUrl} name={name} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{name}</Text>
            <Chip label={`Level ${progress.level}`} icon="shield-checkmark" />
          </View>
        </View>
        <View style={styles.xpBox}>
          <View style={styles.xpRow}>
            <Text style={styles.xpValue}>{formatXp(xp)}</Text>
            <Text style={styles.xpTarget}> / {formatXp(progress.nextLevelXp)} XP</Text>
            <View style={{ flex: 1 }} />
            <Chip label={`${Math.round(progress.progress * 100)}%`} tone="neutral" />
          </View>
          <ProgressBar progress={progress.progress} height={10} track={colors.white} />
          <View style={styles.xpRow}>
            <Text style={styles.small}>Level {progress.level}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.small, { color: colors.primary }]}>
              ⚡ +{formatXp(progress.xpToNextLevel)} XP to Level {progress.level + 1}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.streakCard}>
        <View style={styles.streakHeader}>
          <IconBubble icon="flame" bg={colors.amber} fg={colors.white} size={36} />
          <Text style={styles.streakTitle}>
            {streak > 0 ? `${streak}-Day Study Streak!` : "Start a Study Streak"}
          </Text>
          {bonus > 0 ? <Chip label={`+${bonus} XP bonus`} tone="neutral" /> : null}
        </View>
        <Text style={styles.streakText}>
          Complete an exchange session or challenge today to keep your streak going.
        </Text>
        <View style={styles.weekRow}>
          {week.map((day) => (
            <View key={day.key} style={styles.weekDay}>
              <Text style={styles.weekLabel}>{day.label.slice(0, 1)}</Text>
              <View
                style={[
                  styles.weekCircle,
                  day.xp > 0 ? styles.weekCircleDone : day.isToday ? styles.weekCircleToday : null,
                ]}
              >
                {day.xp > 0 ? (
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                ) : day.isToday ? (
                  <Ionicons name="star" size={14} color={colors.amber} />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <Card style={{ gap: 14 }}>
        <View style={styles.weekHeader}>
          <View>
            <Text style={styles.small}>Weekly Gain</Text>
            <Text style={styles.weeklyValue}>+{formatXp(weeklyGain)} XP</Text>
          </View>
          {shownDay ? (
            <View style={styles.topDay}>
              <Text style={styles.small}>{shownDay === topDay ? "Top Day" : "Selected"}</Text>
              <Text style={styles.topDayValue}>
                {shownDay.label} • +{shownDay.xp} XP
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.chart} accessibilityLabel="XP gained per day over the last 7 days">
          {week.map((day) => {
            const height = day.xp > 0 ? Math.max(6, (day.xp / maxXp) * CHART_HEIGHT) : 2;
            const highlighted = shownDay?.key === day.key;
            return (
              <Pressable
                key={day.key}
                style={styles.barSlot}
                onPress={() => setSelectedDay(day.key)}
                accessibilityRole="button"
                accessibilityLabel={`${day.label}: ${day.xp} XP`}
              >
                <Text style={styles.barValue}>{highlighted && day.xp > 0 ? day.xp : ""}</Text>
                <View
                  style={[
                    styles.bar,
                    { height, backgroundColor: highlighted ? colors.primary : colors.primarySoft },
                  ]}
                />
                <Text style={[styles.barLabel, day.isToday && styles.barLabelToday]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={styles.hub}>
        {HUB_LINKS.map((link) => (
          <Pressable key={link.label} style={styles.hubItem} onPress={() => router.push(link.href)}>
            <IconBubble icon={link.icon} />
            <Text style={styles.hubLabel}>{link.label}</Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.hubItem}
          onPress={() => router.push({ pathname: "/reviews/[userId]", params: { userId } })}
        >
          <IconBubble icon="star-outline" />
          <Text style={styles.hubLabel}>My Reviews</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {transactions.length === 0 ? (
        <Card>
          <Text style={styles.small}>
            No XP yet. Complete a session, give a review or play a challenge to start earning.
          </Text>
        </Card>
      ) : (
        transactions.slice(0, 10).map((tx) => {
          const reason = tx.reason ?? "SESSION_COMPLETED";
          return (
            <Card key={tx.transactionId} style={styles.activity}>
              <IconBubble icon={REASON_ICONS[reason]} bg={colors.mintSoft} fg={colors.teal} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>{XP_REASON_LABELS[reason]}</Text>
                <Text style={styles.small}>{formatListTime(tx.createdAt)}</Text>
              </View>
              <Chip label={`${tx.amount >= 0 ? "+" : ""}${tx.amount} XP`} tone={tx.amount >= 0 ? "mint" : "peach"} />
            </Card>
          );
        })
      )}

      <Button
        label="Start New Swap"
        icon="swap-horizontal"
        onPress={() => router.push("/member3/MatchesScreen")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  xpBox: { backgroundColor: colors.primarySoft, borderRadius: 16, padding: 14, gap: 10 },
  xpRow: { flexDirection: "row", alignItems: "baseline" },
  xpValue: { fontSize: 36, fontWeight: "800", color: colors.primary },
  xpTarget: { fontSize: 16, color: colors.textSecondary },
  small: { fontSize: 13, color: colors.textSecondary },
  streakCard: { backgroundColor: colors.peach, borderRadius: 20, padding: 16, gap: 10 },
  streakHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  streakTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  streakText: { fontSize: 14, color: colors.amber },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 4 },
  weekLabel: { fontSize: 12, fontWeight: "700", color: colors.amber },
  weekCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E7C49B",
  },
  weekCircleDone: { backgroundColor: colors.amber, borderColor: colors.amber },
  weekCircleToday: { backgroundColor: colors.white, borderColor: colors.amber },
  weekHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  weeklyValue: { fontSize: 24, fontWeight: "800", color: colors.textPrimary },
  topDay: { backgroundColor: colors.background, borderRadius: 12, padding: 10, alignItems: "flex-end" },
  topDayValue: { fontSize: 14, fontWeight: "700", color: colors.teal },
  chart: { flexDirection: "row", alignItems: "flex-end", height: CHART_HEIGHT + 44 },
  barSlot: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 2 },
  bar: { width: "70%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barValue: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  barLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  barLabelToday: { color: colors.primary, fontWeight: "700" },
  hub: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  hubItem: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  hubLabel: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  activity: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  activityTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
});
