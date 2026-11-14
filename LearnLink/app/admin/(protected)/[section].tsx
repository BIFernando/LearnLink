import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const sectionTitles: Record<string, string> = {
  skills: "Skill Management",
  reports: "Reports",
  analytics: "Analytics",
};

export default function AdminSectionPlaceholder() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const title = section ? sectionTitles[section] : undefined;

  if (!title) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Section not found</Text>
        <Pressable onPress={() => router.replace("/admin")}>
          <Text style={styles.link}>Return to dashboard</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>LEARNLINK / ADMIN</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          This section is not implemented yet. No management actions or
          additional data are available here.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace("/admin")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 520,
    padding: 26,
    width: "100%",
  },
  eyebrow: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    color: "#17243A",
    fontSize: 24,
    fontWeight: "700",
  },
  description: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
    marginTop: 10,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    minHeight: 46,
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  link: {
    color: "#3159A5",
    fontSize: 15,
    marginTop: 12,
  },
});
