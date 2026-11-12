// ============================================
// FILE: src/screens/matching/MatchesScreen.tsx
// SCREEN 14: Matches List (Fixed)
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';  // ← FIXED
import { Ionicons } from '@expo/vector-icons';
import { mockMatches, getUserById } from '../../utils/mockData';
import { colors } from '../../theme/colors';

interface MatchCardProps {
  match: any;
  onPress: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const user = getUserById(match.matchedUserId);
  const topReasons = match.reasons.slice(0, 3);

  const getMatchLabel = (score: number) => {
    if (score >= 90) return { text: '🔥 Excellent match', color: '#4CAF50' };
    if (score >= 70) return { text: '💪 Great match', color: '#FFC107' };
    return { text: '👍 Good match', color: '#FF9800' };
  };

  const matchLabel = getMatchLabel(match.score);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Score Badge */}
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreText}>{match.score}%</Text>
      </View>

      {/* User Info Row */}
      <View style={styles.userRow}>
        <Image 
          source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/60' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.displayName}</Text>
          <View style={styles.userMetaRow}>
            <Text style={styles.userLocation}>📍 {user?.location || 'Unknown'}</Text>
            <Text style={styles.userRating}>⭐ {user?.ratingAverage || 0} · {user?.ratingCount || 0} sessions</Text>
          </View>
        </View>
      </View>

      {/* Match Label */}
      <Text style={[styles.matchLabel, { color: matchLabel.color }]}>
        {matchLabel.text}
      </Text>

      {/* Skills and Reasons */}
      <View style={styles.detailsContainer}>
        {match.matchedSkills.map((skill: string, index: number) => (
          <View key={index} style={styles.skillDetail}>
            <View style={styles.skillHeader}>
              <Text style={styles.skillDot}>•</Text>
              <Text style={styles.skillName}>{skill}</Text>
            </View>
            <View style={styles.reasonList}>
              {match.reasons
                .filter((r: string) => r.includes(skill))
                .slice(0, 2)
                .map((reason: string, i: number) => (
                  <Text key={i} style={styles.reasonText}>{reason}</Text>
                ))}
            </View>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const MatchesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [matches, setMatches] = useState<any[]>([]);  // ← FIXED
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = () => {
    setLoading(true);
    // Check if mockMatches exists
    if (mockMatches && mockMatches.length > 0) {
      setTimeout(() => {
        setMatches(mockMatches);
        setLoading(false);
      }, 500);
    } else {
      setMatches([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadMatches();
      setRefreshing(false);
    }, 1000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your Matches</Text>
          <Text style={styles.headerSubtitle}>Find your perfect partner</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Match Count */}
      <Text style={styles.matchCount}>{matches.length} matches found</Text>

      {/* Matches List */}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        renderItem={({ item }) => (
          <MatchCard 
            match={item} 
            onPress={() => navigation?.navigate('MatchDetails', { matchId: item.matchId })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyMessage}>Add more skills to your profile!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF1',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  filterButton: {
    padding: 8,
  },
  matchCount: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#F5F7FA',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#E8ECF1',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  userLocation: {
    fontSize: 14,
    color: '#666666',
    marginRight: 12,
  },
  userRating: {
    fontSize: 14,
    color: '#666666',
  },
  matchLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E8ECF1',
    paddingTop: 10,
  },
  skillDetail: {
    marginBottom: 4,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillDot: {
    fontSize: 16,
    color: '#6C63FF',
    marginRight: 4,
    fontWeight: 'bold',
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  reasonList: {
    paddingLeft: 20,
  },
  reasonText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default MatchesScreen;