// ============================================
// FILE: src/components/matching/ScoreBadge.tsx
// Score Badge Component
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface ScoreBadgeProps {
  score: number;
  size?: 'small' | 'large';
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'small' }) => {
  const isLarge = size === 'large';
  
  return (
    <View style={[
      styles.badge,
      isLarge && styles.badgeLarge
    ]}>
      <Text style={[
        styles.scoreText,
        isLarge && styles.scoreTextLarge
      ]}>
        {score}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  badgeLarge: {
    position: 'relative',
    top: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 80,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  scoreTextLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
});

export default ScoreBadge;