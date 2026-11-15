import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { m5Colors } from "@/constants/member5Theme";
import {
  displayNameOf,
  useUserProfiles,
} from "@/services/member5/userService";
import {
  getAcceptedExchanges,
  getSkillName,
} from "@/services/chatService";
import { getCurrentUserId } from "@/services/member4/currentUser";
import type { ExchangeRequest } from "@/types/member4/member4";

type EligibleExchange = {
  exchange: ExchangeRequest;
  otherParticipantId: string;
  skillChoices: {
    key: "offered" | "requested";
    skillId: string;
    skillName: string | null;
    userIsTeacher: boolean;
  }[];
};

export default function SelectExchangeForSessionScreen() {
  const [exchanges, setExchanges] = useState<EligibleExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherParticipantIds, setOtherParticipantIds] = useState<string[]>([]);
  const userProfiles = useUserProfiles(otherParticipantIds);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadExchanges() {
        setLoading(true);
        setError(null);

        try {
          const currentUserId = getCurrentUserId();
          const acceptedRequests = await getAcceptedExchanges(currentUserId);
          const eligibleRequests = acceptedRequests.filter(
            (request) =>
              request.status === "ACCEPTED" &&
              (request.senderId === currentUserId ||
                request.receiverId === currentUserId),
          );
          const skillIds = [
            ...new Set(
              eligibleRequests
                .flatMap((request) => [
                  request.offeredSkillId,
                  request.requestedSkillId,
                ])
                .filter(Boolean),
            ),
          ];
          const skillNames = new Map<string, string | null>();
          await Promise.all(
            skillIds.map(async (skillId) => {
              skillNames.set(skillId, await getSkillName(skillId));
            }),
          );
          const eligibleExchanges = eligibleRequests.map((exchange) => ({
            exchange,
            otherParticipantId:
              exchange.senderId === currentUserId
                ? exchange.receiverId
                : exchange.senderId,
            skillChoices: [
              {
                key: "offered" as const,
                skillId: exchange.offeredSkillId,
                skillName: skillNames.get(exchange.offeredSkillId) ?? null,
                userIsTeacher: exchange.senderId === currentUserId,
              },
              {
                key: "requested" as const,
                skillId: exchange.requestedSkillId,
                skillName: skillNames.get(exchange.requestedSkillId) ?? null,
                userIsTeacher: exchange.receiverId === currentUserId,
              },
            ].filter((choice) => Boolean(choice.skillId)),
          }));

          if (isActive) {
            setExchanges(eligibleExchanges);
            setOtherParticipantIds(
              eligibleExchanges.map((item) => item.otherParticipantId),
            );
          }
        } catch (loadError) {
          console.error("Failed to load accepted exchanges:", loadError);
          if (isActive) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Could not load accepted exchanges.",
            );
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      void loadExchanges();

      return () => {
        isActive = false;
      };
    }, []),
  );

  function selectExchange(exchangeRequestId: string, skillId: string) {
    router.push({
      pathname: "/member4/schedule-session",
      params: { exchangeRequestId, skillId },
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={m5Colors.primary} />
        <Text style={styles.stateText}>Loading accepted exchanges...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>Could not load exchanges</Text>
        <Text style={styles.stateText}>{error}</Text>
      </View>
    );
  }

  if (exchanges.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>No accepted exchanges yet</Text>
        <Text style={styles.stateText}>
          Accept an exchange request before scheduling a session.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/member4/exchange-requests")}
          style={styles.stateButton}
        >
          <Text style={styles.stateButtonText}>View exchange requests</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
    >
      <Text style={styles.title}>Select an accepted exchange</Text>
      <Text style={styles.subtitle}>
        Choose the skill for the session you want to propose.
      </Text>

      {exchanges.map(({ exchange, otherParticipantId, skillChoices }) => (
        <View key={exchange.id} style={styles.exchangeCard}>
          <View style={styles.exchangeHeader}>
            <View style={styles.exchangeIcon}>
              <Ionicons
                name="people-outline"
                size={21}
                color={m5Colors.primary}
              />
            </View>
            <View style={styles.exchangeSummary}>
              <Text style={styles.participantName}>
                {displayNameOf(userProfiles[otherParticipantId])}
              </Text>
              <Text style={styles.exchangeType}>
                {exchange.exchangeType === "CREDIT"
                  ? `Credit exchange · ${exchange.creditAmount} credits`
                  : "Direct exchange"}
              </Text>
            </View>
          </View>

          <Text style={styles.chooseSkill}>Choose a skill</Text>
          {skillChoices.map((choice) => (
            <Pressable
              accessibilityRole="button"
              key={choice.key}
              onPress={() => selectExchange(exchange.id, choice.skillId)}
              style={({ pressed }) => [
                styles.skillChoice,
                pressed && styles.skillChoicePressed,
              ]}
            >
              <View style={styles.skillText}>
                <Text style={styles.skillDirection}>
                  {choice.userIsTeacher ? "You teach" : "You learn"} ·{" "}
                  {choice.key === "offered" ? "Offered skill" : "Requested skill"}
                </Text>
                <Text style={styles.skillId}>
                  {choice.skillName ?? `Skill ID: ${choice.skillId}`}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={19}
                color={m5Colors.primary}
              />
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: m5Colors.background,
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    alignItems: "center",
    backgroundColor: m5Colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: m5Colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: m5Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 6,
  },
  exchangeCard: {
    backgroundColor: m5Colors.card,
    borderColor: m5Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  exchangeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  exchangeIcon: {
    alignItems: "center",
    backgroundColor: m5Colors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  exchangeSummary: {
    flex: 1,
  },
  participantName: {
    color: m5Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  exchangeType: {
    color: m5Colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  chooseSkill: {
    color: m5Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 18,
    textTransform: "uppercase",
  },
  skillChoice: {
    alignItems: "center",
    borderColor: m5Colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 8,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skillChoicePressed: {
    backgroundColor: m5Colors.primarySoft,
  },
  skillText: {
    flex: 1,
  },
  skillDirection: {
    color: m5Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  skillId: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  stateTitle: {
    color: m5Colors.textPrimary,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    color: m5Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  stateButton: {
    backgroundColor: m5Colors.primary,
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stateButtonText: {
    color: m5Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
