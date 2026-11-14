import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Chip,
  EmptyState,
  ErrorState,
  IconBubble,
  LoadingState,
  ProgressBar,
  type IoniconName,
} from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import { errorMessage, formatXp, toDate } from "@/services/member5/format";
import {
  getBadgeProgressCounts,
  getBadges,
  subscribeToUserBadges,
  type BadgeProgressCounts,
} from "@/services/member5/gamificationService";
import { useLiveUser } from "@/services/member5/userService";
import type { Badge, UserBadge } from "@/types/member5";

type Filter = "ALL" | "EARNED" | "LOCKED" | "SPECIAL";

const BADGE_TONES = [
  { bg: colors.primarySoft, fg: colors.primary },
  { bg: colors.mint, fg: "#08433D" },
  { bg: colors.peach, fg: colors.amber },
];

export default function BadgesScreen() {
  const { user: authUser } = useAuth();
  const userId = authUser?.uid;
  const { user } = useLiveUser(userId);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earned, setEarned] = useState<UserBadge[]>([]);
  const [counts, setCounts] = useState<BadgeProgressCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBadges(await getBadges());
    } catch (err) {
      setError(errorMessage(err, "Failed to load badges."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToUserBadges(userId, setEarned, (err) =>
      setError(errorMessage(err, "Failed to load your badges.")),
    );
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getBadgeProgressCounts(user).then((value) => {
      if (active) setCounts(value);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const earnedById = useMemo(() => new Map(earned.map((item) => [item.badgeId, item])), [earned]);
  const earnedCount = badges.filter((badge) => earnedById.has(badge.badgeId)).length;
  const share = badges.length ? earnedCount / badges.length : 0;

  const visible = badges.filter((badge) => {
    const isEarned = earnedById.has(badge.badgeId);
    if (filter === "EARNED") return isEarned;
    if (filter === "LOCKED") return !isEarned;
    if (filter === "SPECIAL") return badge.category === "SPECIAL";
    return true;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadBadges} />;
  if (badges.length === 0) {
    return (
      <EmptyState
        icon="ribbon-outline"
        title="No badges yet"
        message="Badges haven't been set up. Run the Member 5 seed script to add them."
      />
    );
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "ALL", label: `All (${badges.length})` },
    { key: "EARNED", label: `Earned (${earnedCount})` },
    { key: "LOCKED", label: `Locked (${badges.length - earnedCount})` },
    { key: "SPECIAL", label: "Special" },
  ];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      columnWrapperStyle={{ gap: 12 }}
      numColumns={2}
      data={visible}
      keyExtractor={(item) => item.badgeId}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 4 }}>
          <View style={styles.showcase}>
            <View style={styles.showcaseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.caps}>SHOWCASE COLLECTION</Text>
                <Text style={styles.showcaseTitle}>
                  {earnedCount} of {badges.length} Badges
                </Text>
              </View>
              <View style={styles.ring}>
                <Text style={styles.ringText}>{Math.round(share * 100)}%</Text>
              </View>
            </View>
            <View style={styles.showcaseRow}>
              <Text style={styles.small}>Collection progress</Text>
              <Text style={[styles.small, { color: colors.primary }]}>
                {badges.length - earnedCount} Badges Left
              </Text>
            </View>
            <ProgressBar progress={share} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filters.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={filter === option.key}
                icon={option.key === "SPECIAL" ? "star-outline" : undefined}
                onPress={() => setFilter(option.key)}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<Text style={styles.small}>No badges in this filter yet.</Text>}
      renderItem={({ item, index }) => {
        const userBadge = earnedById.get(item.badgeId);
        const tone = BADGE_TONES[index % BADGE_TONES.length];
        const current = counts?.[item.requirement.type] ?? 0;
        const progress = Math.min(1, current / Math.max(1, item.requirement.threshold));
        const icon = (item.icon || "ribbon-outline") as IoniconName;

        return (
          <View style={[styles.badge, !userBadge && styles.badgeLocked]}>
            <View style={styles.badgeTop}>
              <IconBubble
                icon={icon}
                bg={userBadge ? tone.bg : colors.border}
                fg={userBadge ? tone.fg : colors.textMuted}
                size={42}
              />
              <View style={[styles.status, userBadge ? styles.statusEarned : styles.statusLocked]}>
                <Ionicons
                  name={userBadge ? "checkmark-circle-outline" : "lock-closed-outline"}
                  size={12}
                  color={userBadge ? "#08433D" : colors.textMuted}
                />
                <Text style={[styles.statusText, !userBadge && { color: colors.textMuted }]}>
                  {userBadge ? "Earned" : "Locked"}
                </Text>
              </View>
            </View>
            <Text style={[styles.badgeName, !userBadge && { color: colors.textSecondary }]}>{item.name}</Text>
            <Text style={styles.badgeDesc} numberOfLines={3}>
              {item.description}
            </Text>
            <View style={{ flex: 1 }} />
            {userBadge ? (
              <View style={styles.badgeFooter}>
                <Text style={[styles.small, { color: colors.teal }]}>
                  {toDate(userBadge.awardedAt)?.toLocaleDateString([], { month: "short", day: "2-digit" })}
                </Text>
                <Text style={[styles.small, { color: colors.primary, fontWeight: "700" }]}>
                  +{formatXp(item.xpReward)} XP
                </Text>
              </View>
            ) : (
              <View style={{ gap: 4 }}>
                <View style={styles.badgeFooter}>
                  <Text style={styles.tiny}>
                    {current > 0
                      ? `${formatXp(Math.min(current, item.requirement.threshold))} / ${formatXp(item.requirement.threshold)}`
                      : "Not Started"}
                  </Text>
                  <Text style={styles.tiny}>{Math.round(progress * 100)}%</Text>
                </View>
                <ProgressBar progress={progress} height={6} color={colors.textMuted} track={colors.white} />
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  showcase: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 16, gap: 10 },
  showcaseRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  caps: { fontSize: 13, fontWeight: "700", letterSpacing: 0.6, color: colors.teal },
  showcaseTitle: { fontSize: 28, fontWeight: "800", color: colors.textPrimary },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  ringText: { fontSize: 15, fontWeight: "800", color: colors.primary },
  small: { fontSize: 13, color: colors.textSecondary },
  tiny: { fontSize: 12, color: colors.textSecondary },
  badge: {
    flex: 1,
    minHeight: 190,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    gap: 6,
  },
  badgeLocked: { backgroundColor: "#EFEFF8" },
  badgeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  status: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusEarned: { backgroundColor: colors.mint },
  statusLocked: { backgroundColor: colors.border },
  statusText: { fontSize: 12, fontWeight: "700", color: "#08433D" },
  badgeName: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  badgeDesc: { fontSize: 13, color: colors.textSecondary },
  badgeFooter: { flexDirection: "row", justifyContent: "space-between" },
});
