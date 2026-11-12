import { StyleSheet, Text, View } from "react-native";

export const colors = {
  white: "#FFFFFF",
  textPrimary: "#1A1A2E",
  textSecondary: "#666666",
};

export function ScoreBadge({
  score,
  size = "default",
}: {
  score: number;
  size?: "default" | "large";
}) {
  return (
    <View style={[styles.scoreBadge, size === "large" && styles.scoreBadgeLarge]}>
      <Text style={[styles.scoreText, size === "large" && styles.scoreTextLarge]}>
        {score}%
      </Text>
    </View>
  );
}

export function SkillTag({
  skill,
}: {
  skill: string;
  type?: "match";
}) {
  return (
    <View style={styles.skillTag}>
      <Text style={styles.skillTagText}>{skill}</Text>
    </View>
  );
}

export function ProgressBar({
  score,
  label,
  weight,
  icon,
  description,
}: {
  score: number;
  label: string;
  weight: string;
  icon: string;
  description: string;
}) {
  const boundedScore = Math.min(100, Math.max(0, score));

  return (
    <View style={styles.factorCard}>
      <View style={styles.factorHeading}>
        <Text style={styles.factorIcon}>{icon}</Text>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={styles.factorWeight}>{weight}</Text>
        <Text style={styles.factorScore}>{boundedScore}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.progress, { width: `${boundedScore}%` }]} />
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreBadge: {
    alignItems: "center",
    backgroundColor: "#E9E7FF",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 52,
    paddingHorizontal: 10,
  },
  scoreBadgeLarge: {
    borderRadius: 40,
    minHeight: 80,
    minWidth: 100,
  },
  scoreText: {
    color: "#5148C8",
    fontSize: 14,
    fontWeight: "700",
  },
  scoreTextLarge: {
    fontSize: 26,
  },
  skillTag: {
    backgroundColor: "#EEF3FF",
    borderColor: "#D8E2FC",
    borderRadius: 16,
    borderWidth: 1,
    margin: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  skillTagText: {
    color: "#3159A5",
    fontSize: 13,
    fontWeight: "600",
  },
  factorCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8ECF1",
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 7,
    padding: 14,
  },
  factorHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  factorIcon: {
    fontSize: 16,
  },
  factorLabel: {
    color: "#24324A",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  factorWeight: {
    color: "#718096",
    fontSize: 12,
  },
  factorScore: {
    color: "#3159A5",
    fontSize: 13,
    fontWeight: "700",
    minWidth: 38,
    textAlign: "right",
  },
  track: {
    backgroundColor: "#E8EDF5",
    borderRadius: 4,
    height: 7,
    marginTop: 12,
    overflow: "hidden",
  },
  progress: {
    backgroundColor: "#6C63FF",
    borderRadius: 4,
    height: "100%",
  },
  description: {
    color: "#718096",
    fontSize: 12,
    marginTop: 8,
  },
});
