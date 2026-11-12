// ============================================
// FILE: src/components/matching/MatchCard.tsx
// Reusable Match Card Component
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { getUserById } from '../../utils/mockData';
import ScoreBadge from './ScoreBadge';
import SkillTag from './SkillTag';

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
      <ScoreBadge score={match.score} />

      {/* User Info Row */}
      <View style={styles.userRow}>
        <Image 
          source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/56' }}
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
              <SkillTag skill={skill} />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    color: colors.textPrimary,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  userLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 12,
  },
  userRating: {
    fontSize: 14,
    color: colors.textSecondary,
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
  reasonList: {
    paddingLeft: 4,
  },
  reasonText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 1,
  },
});

export default MatchCard;