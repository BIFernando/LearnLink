import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconBubble,
  LoadingState,
  StarRating,
} from "@/components/member5/ui";
import { db } from "@/config/firebase";
import { m5Colors as colors } from "@/constants/member5Theme";
import { XP_PER_REVIEW } from "@/functions/src/member5/xpRules";
import { useAuth } from "@/providers/AuthProvider";
import { sessionDate } from "@/services/chatService";
import { errorMessage } from "@/services/member5/format";
import {
  RATING_LABELS,
  ReviewNotAllowedError,
  getMyReview,
  getReviewableSession,
  submitReview,
} from "@/services/member5/reviewService";
import { displayNameOf, getUserProfile } from "@/services/member5/userService";
import type { Session } from "@/types/member4/member4";
import {
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_TAGS,
  REVIEW_TAG_LABELS,
  type GamifiedUser,
  type ReviewTag,
} from "@/types/member5";

type Status = "loading" | "ready" | "blocked" | "alreadyReviewed" | "submitted" | "error";

export default function GiveReviewScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const userId = user?.uid;

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [reviewee, setReviewee] = useState<GamifiedUser | null>(null);
  const [revieweeId, setRevieweeId] = useState("");
  const [skillName, setSkillName] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    if (!sessionId || !userId) return;
    setStatus("loading");
    try {
      const result = await getReviewableSession(sessionId, userId);
      setSession(result.session);
      setRevieweeId(result.revieweeId);
      const [profile, existing, skill] = await Promise.all([
        getUserProfile(result.revieweeId).catch(() => null),
        getMyReview(sessionId, userId),
        getDoc(doc(db, "skills", result.session.skillId)).catch(() => null),
      ]);
      setReviewee(profile);
      const name = skill?.get("name");
      setSkillName(typeof name === "string" ? name : null);
      setStatus(existing ? "alreadyReviewed" : "ready");
    } catch (err) {
      setMessage(errorMessage(err, "Could not load this session."));
      setStatus(err instanceof ReviewNotAllowedError ? "blocked" : "error");
    }
  }, [sessionId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleTag = (tag: ReviewTag) =>
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));

  const handleSubmit = async () => {
    if (!sessionId || !userId || submitting) return;
    if (rating === 0) {
      setSubmitError("Tap the stars to choose a rating.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitReview({ sessionId, revieweeId, rating, comment, tags }, userId);
      setStatus("submitted");
    } catch (err) {
      setSubmitError(errorMessage(err, "Could not submit your review. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const name = displayNameOf(reviewee);
  const viewReviews = () =>
    router.replace({ pathname: "/reviews/[userId]", params: { userId: revieweeId } });

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={message} onRetry={load} />;
  if (status === "blocked") {
    return <EmptyState icon="lock-closed-outline" title="Review not available" message={message} />;
  }
  if (status === "alreadyReviewed" || status === "submitted") {
    return (
      <EmptyState
        icon="checkmark-circle-outline"
        title={status === "submitted" ? "Thanks for your review!" : "Already reviewed"}
        message={
          status === "submitted"
            ? `+${XP_PER_REVIEW} XP is on its way to your progress.`
            : `You've already reviewed this session with ${name}.`
        }
        action={<Button label={`View ${name}'s reviews`} onPress={viewReviews} />}
      />
    );
  }

  const date = session ? sessionDate(session) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <View style={styles.peerRow}>
          <Avatar uri={reviewee?.profilePhotoUrl} name={name} size={64} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.peerName}>{name}</Text>
            {skillName ? <Chip label={skillName} tone="mint" icon="swap-horizontal" /> : null}
            <Chip
              tone="neutral"
              icon="time-outline"
              label={[
                session?.duration ? `${session.duration}m` : null,
                date?.toLocaleDateString([], { month: "short", day: "numeric" }),
              ]
                .filter(Boolean)
                .join(" • ")}
            />
          </View>
        </View>
      </Card>

      <Card style={styles.center}>
        <Text style={styles.question}>How was your learning experience?</Text>
        <Text style={styles.muted}>Your honest feedback helps the peer community grow.</Text>
        <StarRating value={rating} size={40} onChange={setRating} />
        {rating > 0 ? (
          <Chip label={`${rating.toFixed(1)} — ${RATING_LABELS[rating]}`} tone="peach" icon="sparkles" />
        ) : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>What went well?</Text>
          <Text style={styles.muted}>Select all that apply</Text>
        </View>
        <View style={styles.tags}>
          {REVIEW_TAGS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <Chip
                key={tag}
                label={REVIEW_TAG_LABELS[tag]}
                icon={selected ? "checkmark-circle-outline" : "add"}
                tone={selected ? "primary" : "neutral"}
                onPress={() => toggleTag(tag)}
              />
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Write your review</Text>
          <Text style={[styles.muted, { color: colors.teal }]}>Public praise</Text>
        </View>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            multiline
            value={comment}
            onChangeText={setComment}
            maxLength={REVIEW_COMMENT_MAX_LENGTH}
            placeholder={`What did ${name} do well?`}
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.rowBetween}>
            <View style={styles.inline}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.teal} />
              <Text style={styles.muted}>Visible to peer network</Text>
            </View>
            <Text style={styles.muted}>
              {comment.length} / {REVIEW_COMMENT_MAX_LENGTH}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.rewardBanner}>
        <IconBubble icon="star" bg={colors.amber} fg={colors.white} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rewardTitle}>Earn +{XP_PER_REVIEW} XP & Badge Progress</Text>
          <Text style={styles.rewardText}>Submitting verified feedback counts towards review badges.</Text>
        </View>
      </View>

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

      <Button
        label="Submit Review"
        icon="arrow-forward"
        onPress={handleSubmit}
        loading={submitting}
        disabled={rating === 0}
      />
      <Button label="Skip for now" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  peerRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  peerName: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  center: { alignItems: "center", gap: 10 },
  question: { fontSize: 19, fontWeight: "800", color: colors.textPrimary, textAlign: "center" },
  muted: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inputBox: { backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12, gap: 8 },
  input: { minHeight: 110, fontSize: 15, color: colors.textPrimary, textAlignVertical: "top" },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.peach,
  },
  rewardTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  rewardText: { fontSize: 13, color: colors.amber },
  error: { color: colors.error, textAlign: "center" },
});
