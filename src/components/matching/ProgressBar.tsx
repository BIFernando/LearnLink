// ============================================
// FILE: src/components/matching/ProgressBar.tsx
// Progress Bar Component for Factors
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface ProgressBarProps {
  score: number;
  label: string;
  weight: string;
  icon: string;
  description?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  score,
  label,
  weight,
  icon,
  description,
}) => {
  const getProgressColor = (value: number) => {
    if (value >= 80) return '#4CAF50';
    if (value >= 60) return '#FFC107';
    return '#FF5252';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.info}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.weight}>Weight: {weight}</Text>
        </View>
        <Text style={styles.score}>{score}%</Text>
      </View>
      
      <View style={styles.track}>
        <View 
          style={[
            styles.fill, 
            { 
              width: `${score}%`, 
              backgroundColor: getProgressColor(score) 
            }
          ]} 
        />
      </View>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  weight: {
    fontSize: 12,
    color: colors.textMuted,
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  track: {
    height: 6,
    backgroundColor: '#E8ECF1',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
});

export default ProgressBar;