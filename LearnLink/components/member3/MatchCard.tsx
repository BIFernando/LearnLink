// ============================================
// FILE: components/member3/MatchCard.tsx
// Member 3 - Match Card UI
// ============================================

import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const DEFAULT_PROFILE_PHOTO_URL =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

const getProfilePhotoUri = (url: unknown): string =>
  typeof url === "string" && /^https?:\/\/\S+$/i.test(url)
    ? url
    : DEFAULT_PROFILE_PHOTO_URL;

const MatchCard = ({ match, onPress }: { match: any; onPress: () => void }) => {
  const [profilePhotoUri, setProfilePhotoUri] = useState(() =>
    getProfilePhotoUri(match.profilePhotoUrl),
  );

  useEffect(() => {
    setProfilePhotoUri(getProfilePhotoUri(match.profilePhotoUrl));
  }, [match.profilePhotoUrl]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: profilePhotoUri }}
            onError={() => setProfilePhotoUri(DEFAULT_PROFILE_PHOTO_URL)}
            style={styles.avatar}
          />
          <Text style={styles.name}>{match.displayName || "Student"}</Text>
        </View>
        <Text style={styles.score}>{match.score}%</Text>
      </View>

      <View style={styles.skills}>
        {match.matchedSkills.map((s: string, i: number) => (
          <Text key={i} style={styles.skillTag}>
            {s}
          </Text>
        ))}
      </View>

      <Text style={styles.reason}>{match.reasons[0]}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#E8ECF1",
  },
  name: { fontSize: 18, fontWeight: "bold", color: "#1A1A2E" },
  score: { fontSize: 18, fontWeight: "bold", color: "#6C63FF" },
  skills: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  skillTag: {
    backgroundColor: "#EEF2FF",
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    fontSize: 12,
    color: "#6C63FF",
  },
  reason: { color: "#666", fontSize: 13 },
});

export default MatchCard;
