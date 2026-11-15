import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface FilterBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      <TouchableOpacity
        style={[styles.chip, !selectedCategory && styles.activeChip]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={[styles.chipText, !selectedCategory && styles.activeChipText]}>All</Text>
      </TouchableOpacity>
      {categories.map((cat, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.chip, selectedCategory === cat && styles.activeChip]}
          onPress={() => onSelectCategory(cat)}
        >
          <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>{cat}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingVertical: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 10 },
  activeChip: { backgroundColor: '#6C63FF' },
  chipText: { fontSize: 14, color: '#666', fontWeight: '600' },
  activeChipText: { color: '#fff' },
});

export default FilterBar;