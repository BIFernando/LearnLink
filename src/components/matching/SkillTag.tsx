// ============================================
// FILE: src/components/matching/SkillTag.tsx
// Skill Tag Component
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface SkillTagProps {
  skill: string;
  type?: 'offer' | 'want' | 'match';
  size?: 'small' | 'medium';
}

const SkillTag: React.FC<SkillTagProps> = ({ 
  skill, 
  type = 'match',
  size = 'medium' 
}) => {
  const getTagStyle = () => {
    switch (type) {
      case 'offer':
        return styles.tagOffer;
      case 'want':
        return styles.tagWant;
      default:
        return styles.tagMatch;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'offer':
        return styles.textOffer;
      case 'want':
        return styles.textWant;
      default:
        return styles.textMatch;
    }
  };

  return (
    <View style={[styles.tag, getTagStyle(), size === 'small' && styles.tagSmall]}>
      <Text style={[styles.text, getTextStyle(), size === 'small' && styles.textSmall]}>
        {skill}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  tagSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagMatch: {
    backgroundColor: '#EEF2FF',
  },
  tagOffer: {
    backgroundColor: '#E8F5E9',
  },
  tagWant: {
    backgroundColor: '#FFF3E0',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 11,
  },
  textMatch: {
    color: colors.primary,
  },
  textOffer: {
    color: '#2E7D32',
  },
  textWant: {
    color: '#E65100',
  },
});

export default SkillTag;