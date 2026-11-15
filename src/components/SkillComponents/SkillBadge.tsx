import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface SkillBadgeProps {
  skillName: string;
  type: 'OFFER' | 'WANT';
  proficiency?: string;
  onRemove?: () => void;
}

const SkillBadge: React.FC<SkillBadgeProps> = ({ 
  skillName, 
  type, 
  proficiency = 'BEGINNER', 
  onRemove 
}) => {
  const isOffer = type === 'OFFER';
  
  const getTypeColor = () => {
    if (isOffer) return '#4CAF50';
    return '#6C63FF';
  };

  const getTypeLabel = () => {
    if (isOffer) return '📤 Teach';
    return '📥 Learn';
  };

  const getProficiencyLabel = (prof: string) => {
    const labels: Record<string, string> = {
      'BEGINNER': '🌟 Beginner',
      'INTERMEDIATE': '⭐ Intermediate',
      'ADVANCED': '🚀 Advanced',
      'EXPERT': '🏆 Expert'
    };
    return labels[prof] || prof;
  };

  return (
    <View style={[styles.container, { borderColor: getTypeColor() }]}>
      <View style={styles.header}>
        <Text style={styles.skillName}>{skillName}</Text>
        {onRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.details}>
        <Text style={[styles.typeBadge, { backgroundColor: getTypeColor() }]}>
          {getTypeLabel()}
        </Text>
        <Text style={styles.proficiency}>
          {getProficiencyLabel(proficiency)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  removeButton: {
    padding: 8,
  },
  removeText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  details: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  proficiency: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});

export default SkillBadge;