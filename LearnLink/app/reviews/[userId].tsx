import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  Button,
  Card,
  Chip,
  ErrorState,
  LoadingState,
  ProgressBar,
  StarRating,
} from "@/components/member5/ui";
import { m5Colors as colors } from "@/constants/member5Theme";
import { useAuth } from "@/providers/AuthProvider";
import { errorMessage, toDate } from "@/services/member5/format";
import { getReviewsForUser, summarizeReviews } from "@/services/member5/reviewService";
import { displayNameOf, useLiveUser, useUserProfiles } from "@/services/member5/userService";
import { REVIEW_TAG_LABELS, type Review } from "@/types/member5";

export default function ViewReviewsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: me } = useAuth();
  const isMe = me?.uid === userId;

  const { user: profile, loading: profileLoading } = useLiveUser(userId);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      setReviews(await getReviewsForUser(userId));
    } catch (err) {
      setError(errorMessage(err, "Failed to load reviews."));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewers = useUserProfiles(reviews.map((review) => review.reviewerId));
  const summary = useMemo(() => summarizeReviews(reviews), [reviews]);
  // Prefer the server-maintained stats; fall back to what we loaded.
  const average = profile?.ratingAverage ?? summary.average;
  const count = profile?.ratingCount ?? summary.count;
  const name = displayNameOf(profile);

  if (loading || profileLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.reviewId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <Card style={styles.profileRow}>
              <Avatar uri={profile?.profilePhotoUrl} name={name} size={64} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.name}>{name}</Text>
                <Chip label={`${count} peer review${count === 1 ? "" : "s"}`} icon="people-outline" />
              </View>
            </Card>

            <Card style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Reputation Metrics</Text>
              <View style={styles.metrics}>
                <View style={styles.scoreBox}>
                  <Text style={styles.score}>{count > 0 ? average.toFixed(1) : "–"}</Text>
                  <StarRating value={average} size={14} />
                  <Text style={styles.muted}>{count} Peer Reviews</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const n = summary.distribution[stars - 1];
                    const share = summary.count ? n / summary.count : 0;
                    return (
                      <View key={stars} style={styles.barRow}>
                        <Text style={styles.barLabel}>{stars}★</Text>
                        <View style={{ flex: 1 }}>
                          <ProgressBar progress={share} height={6} />
                        </View>
                        <Text style={styles.barPct}>{Math.round(share * 100)}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Card>

            {summary.topTags.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.caps}>TOP PEER ENDORSEMENTS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {summary.topTags.map(({ tag, count: tagCount }) => (
                    <Chip key={tag} tone="neutral" label={`${REVIEW_TAG_LABELS[tag]}  ${tagCount}`} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.feedbackHeader}>
              <Text style={styles.sectionTitle}>Community Feedback</Text>
              <Chip label="Most Recent" tone="primary" />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.empty}>
            <Text style={styles.sectionTitle}>No reviews yet</Text>
            <Text style={styles.muted}>
              {isMe
                ? "Reviews appear here after peers rate your completed sessions."
                : `${name} hasn't been reviewed yet.`}
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          const reviewer = reviewers[item.reviewerId];
          const reviewerName = displayNameOf(reviewer);
          const date = toDate(item.createdAt);
          return (
            <Card style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar uri={reviewer?.profilePhotoUrl} name={reviewerName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewer}>{reviewerName}</Text>
                  <Text style={styles.muted}>
                    {date?.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} •{" "}
                    <Text style={{ color: colors.teal }}>Verified Exchange</Text>
                  </Text>
                </View>
                <Text style={styles.rating}>★ {item.rating.toFixed(1)}</Text>
              </View>
              {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
              {item.tags?.length ? (
                <View style={styles.tags}>
                  {item.tags.map((tag) => (
                    <Chip key={tag} label={REVIEW_TAG_LABELS[tag]} tone="mint" />
                  ))}
                </View>
              ) : null}
            </Card>
          );
        }}
      />
      {!isMe ? (
        <View style={styles.footer}>
          <Button
            label="Request Skill Exchange"
            icon="swap-horizontal"
            onPress={() => router.push("/member4/create-exchange-request")}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  metrics: { flexDirection: "row", gap: 16, alignItems: "center" },
  scoreBox: {
    alignItems: "center",
    gap: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  score: { fontSize: 36, fontWeight: "800", color: colors.textPrimary },
  muted: { fontSize: 13, color: colors.textSecondary },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 24, fontSize: 12, color: colors.textSecondary },
  barPct: { width: 36, fontSize: 12, color: colors.textSecondary, textAlign: "right" },
  caps: { fontSize: 13, fontWeight: "700", letterSpacing: 0.6, color: colors.textSecondary },
  feedbackHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  empty: { alignItems: "center", gap: 6 },
  reviewCard: { gap: 10 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewer: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  rating: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  comment: { fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  footer: { padding: 16, backgroundColor: colors.background },
});
