import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../config/firebase";
import MatchCard from "../../components/member3/MatchCard";
import { MatchingService } from "../../services/member3/matchingService";

export default function MatchesScreen() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    let isActive = true;

    if (!userId) {
      setMatches([]);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    const loadData = async () => {
      const service = new MatchingService();
      const data = await service.getMatches(userId);
      if (isActive) {
        setMatches(data);
        setLoading(false);
      }
    };

    void loadData();
    return () => {
      isActive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text>Calculating matches from Firebase...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your Matches</Text>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            onPress={() => console.log("Go to details")}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.centerText}>
            {userId
              ? "No matches found. Add users and skills in Firebase to generate matches!"
              : "Sign in to see your matches."}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA", padding: 16 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerText: { textAlign: "center", marginTop: 50, color: "#666" },
});
