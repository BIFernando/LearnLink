import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Member5Shortcuts } from "@/components/member5/Member5Shortcuts";
import { IconBubble, type IoniconName } from "@/components/member5/ui";
import { m5Colors } from "@/constants/member5Theme";

type HomeFeature = {
  title: string;
  description: string;
  icon: IoniconName;
  href: Href;
};

const MATCHES_ROUTE = "/matches" as Href;

const FEATURES: HomeFeature[] = [
  {
    title: "Skill matches",
    description: "Find students to learn with",
    icon: "people-outline",
    href: MATCHES_ROUTE,
  },
  {
    title: "Exchange requests",
    description: "Review incoming and sent requests",
    icon: "mail-outline",
    href: "/member4/exchange-requests",
  },
  {
    title: "My exchanges",
    description: "See your active skill exchanges",
    icon: "swap-horizontal-outline",
    href: "/member4/my-exchanges",
  },
  {
    title: "Upcoming sessions",
    description: "Check your scheduled sessions",
    icon: "calendar-outline",
    href: "/member4/sessions",
  },
  {
    title: "Credit wallet",
    description: "View your balance and activity",
    icon: "wallet-outline",
    href: "/member4/credit-wallet",
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>LEARNLINK</Text>
          <Text style={styles.title}>Learn by sharing.</Text>
          <Text style={styles.subtitle}>
            Exchange skills, meet your learning community, and grow together.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(MATCHES_ROUTE)}
          style={({ pressed }) => [
            styles.hero,
            pressed && styles.heroPressed,
          ]}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.heroEyebrow}>YOUR NEXT SKILL EXCHANGE</Text>
            <Ionicons name="arrow-forward" size={22} color={m5Colors.white} />
          </View>
          <Text style={styles.heroTitle}>Find your learning match</Text>
          <Text style={styles.heroDescription}>
            Connect with students who can teach what you want to learn.
          </Text>
          <View style={styles.heroAction}>
            <Text style={styles.heroActionText}>Explore skill matches</Text>
            <Ionicons name="arrow-forward" size={17} color={m5Colors.white} />
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your exchange hub</Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <Pressable
                accessibilityRole="button"
                key={feature.title}
                onPress={() => router.push(feature.href)}
                style={({ pressed }) => [
                  styles.featureCard,
                  pressed && styles.featureCardPressed,
                ]}
              >
                <IconBubble icon={feature.icon} size={42} />
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stay connected</Text>
          <Member5Shortcuts />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: m5Colors.background,
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 20,
  },
  brand: {
    color: m5Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    color: m5Colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: m5Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  hero: {
    backgroundColor: m5Colors.primary,
    borderRadius: 22,
    marginBottom: 28,
    padding: 20,
  },
  heroPressed: {
    opacity: 0.9,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroEyebrow: {
    color: "#DADAFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: {
    color: m5Colors.white,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 16,
  },
  heroDescription: {
    color: "#E7E7FF",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    maxWidth: 300,
  },
  heroAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroActionText: {
    color: m5Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: m5Colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 14,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureCard: {
    backgroundColor: m5Colors.card,
    borderColor: m5Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 148,
    padding: 14,
  },
  featureCardPressed: {
    opacity: 0.75,
  },
  featureTitle: {
    color: m5Colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  featureDescription: {
    color: m5Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
});
