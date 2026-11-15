// ============================================
// FILE: components/member3/MatchCard.tsx
// Member 3 - Match Card UI
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const MatchCard = ({ match, onPress }: { match: any, onPress: () => void }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>Potential Match</Text>
        <Text style={styles.score}>{match.score}%</Text>
      </View>
      
      <View style={styles.skills}>
        {match.matchedSkills.map((s: string, i: number) => (
          <Text key={i} style={styles.skillTag}>{s}</Text>
        ))}
      </View>
      
      <Text style={styles.reason}>{match.reasons[0]}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  score: { fontSize: 18, fontWeight: 'bold', color: '#6C63FF' },
  skills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  skillTag: { backgroundColor: '#EEF2FF', padding: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 8, marginBottom: 4, fontSize: 12, color: '#6C63FF' },
  reason: { color: '#666', fontSize: 13 }
});

export default MatchCard;