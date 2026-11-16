import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProgressBar } from "../../components/member3/matching-components";
import { auth } from "../../config/firebase";
import { MatchingService } from "../../services/member3/matchingService";
import type { IMatch, IUser } from "../../types/matching.types";

const matchingService = new MatchingService();

const MatchExplanationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Receive matchedUserId
  const matchedUserId = params.matchedUserId as string;
  const currentUserId = auth.currentUser?.uid ?? "demo-user-1";

  const [match, setMatch] = useState<IMatch | null>(null);
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMatch = async () => {
      setLoading(true);
      const matches = await matchingService.getMatches(currentUserId);

      // Find by matchedUserId
      const selectedMatch =
        matches.find((item) => item.matchedUserId === matchedUserId) ?? null;

      if (isMounted) setMatch(selectedMatch);

      if (selectedMatch) {
        const matchedUser = await matchingService.getUser(
          selectedMatch.matchedUserId,
        );
        if (isMounted) setUser(matchedUser);
      }

      if (isMounted) setLoading(false);
    };

    if (matchedUserId) {
      loadMatch();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [matchedUserId, currentUserId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Loading match explanation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Match not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: "#6C63FF" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const factors = [
    {
      name: "Skill Compatibility",
      score: 92,
      weight: "40%",
      icon: "🎯",
      description: "Skills you offer align with what they want",
    },
    {
      name: "Proficiency Match",
      score: 85,
      weight: "20%",
      icon: "📊",
      description: "Your skill levels are well matched",
    },
    {
      name: "Availability Overlap",
      score: 78,
      weight: "15%",
      icon: "📅",
      description: "Your free time schedules overlap",
    },
    {
      name: "Location & Mode",
      score: 88,
      weight: "10%",
      icon: "📍",
      description: "Same location & session preferences",
    },
    {
      name: "Reputation & Rating",
      score: 90,
      weight: "10%",
      icon: "⭐",
      description: "Both have good ratings and reliability",
    },
    {
      name: "Teaching Experience",
      score: 75,
      weight: "5%",
      icon: "🎓",
      description: "Experience in teaching these skills",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Explanation</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryScore}>{match.score}%</Text>
          <Text style={styles.summaryLabel}>
            Match with {user?.displayName}
          </Text>
          <View style={styles.summarySkills}>
            {match.matchedSkills.map((skill: string, index: number) => (
              <View key={index} style={styles.summarySkillTag}>
                <Text style={styles.summarySkillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Match Factor Breakdown</Text>
          <Text style={styles.sectionSubtitle}>
            Each factor contributes to your overall match score
          </Text>
          {factors.map((factor, index) => (
            <ProgressBar
              key={index}
              score={factor.score}
              label={factor.name}
              weight={factor.weight}
              icon={factor.icon}
              description={factor.description}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Skill Exchange Details</Text>
          {match.matchedSkills.map((skill: string, index: number) => (
            <View key={index} style={styles.skillExchangeCard}>
              <Text style={styles.skillExchangeName}>{skill}</Text>
              <View style={styles.skillExchangeRow}>
                <View
                  style={[
                    styles.skillExchangeTag,
                    styles.skillExchangeTagOffer,
                  ]}
                >
                  <Text style={styles.skillExchangeTagText}>
                    ✅ You offer this
                  </Text>
                </View>
                <Text style={styles.skillExchangeArrow}>⟷</Text>
                <View
                  style={[styles.skillExchangeTag, styles.skillExchangeTagWant]}
                >
                  <Text
                    style={[
                      styles.skillExchangeTagText,
                      styles.skillExchangeTagTextWant,
                    ]}
                  >
                    📚 They want this
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Why This Match?</Text>
          <View style={styles.reasonsCard}>
            {match.reasons.map((reason: string, index: number) => (
              <View key={index} style={styles.reasonItem}>
                <Text style={styles.reasonBullet}>•</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/exchange/CreateExchange",
                params: { matchedUserId: match.matchedUserId },
              })
            }
          >
            <Text style={styles.primaryButtonText}>📨 Request Exchange</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push({
                pathname: "/skills/StudentProfile",
                params: { userId: match.matchedUserId },
              })
            }
          >
            <Text style={styles.secondaryButtonText}>👤 View Full Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Keep your existing styles exactly as they are
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#6C63FF",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  headerRight: { width: 32 },
  scrollContent: { paddingBottom: 40 },
  summaryCard: {
    backgroundColor: "#6C63FF",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  summaryScore: { fontSize: 48, fontWeight: "700", color: "#FFFFFF" },
  summaryLabel: { fontSize: 16, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  summarySkills: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
  },
  summarySkillTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginTop: 4,
  },
  summarySkillText: { color: "#FFFFFF", fontSize: 13, fontWeight: "500" },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 14, color: "#666666", marginBottom: 12 },
  skillExchangeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skillExchangeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  skillExchangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  skillExchangeTag: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  skillExchangeTagOffer: { backgroundColor: "#E8F5E9" },
  skillExchangeTagWant: { backgroundColor: "#FFF3E0" },
  skillExchangeTagText: {
    fontSize: 12,
    color: "#2E7D32",
    textAlign: "center",
    fontWeight: "500",
  },
  skillExchangeTagTextWant: { color: "#E65100" },
  skillExchangeArrow: { fontSize: 20, color: "#999999", paddingHorizontal: 12 },
  reasonsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reasonBullet: { fontSize: 16, color: "#6C63FF", marginRight: 8 },
  reasonText: { fontSize: 14, color: "#1A1A2E", flex: 1 },
  actionsContainer: { marginHorizontal: 16, marginTop: 30 },
  primaryButton: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  secondaryButtonText: { color: "#6C63FF", fontSize: 16, fontWeight: "600" },
});

export default MatchExplanationScreen;
