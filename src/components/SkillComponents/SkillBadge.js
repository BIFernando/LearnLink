import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const SkillBadge = ({ skill, type, onRemove }) => {
    const getTypeColor = () => {
        if (type === 'OFFER') return '#4CAF50';
        if (type === 'WANT') return '#2196F3';
        return '#9E9E9E';
    };

    const getTypeLabel = () => {
        if (type === 'OFFER') return '📤 Teach';
        if (type === 'WANT') return '📥 Learn';
        return '';
    };

    const getProficiencyLabel = (proficiency) => {
        const labels = {
            'BEGINNER': '🌟 Beginner',
            'INTERMEDIATE': '⭐ Intermediate',
            'ADVANCED': '🚀 Advanced',
            'EXPERT': '🏆 Expert'
        };
        return labels[proficiency] || proficiency;
    };

    return (
        <View style={[styles.container, { borderColor: getTypeColor() }]}>
            <View style={styles.header}>
                <Text style={styles.skillName}>
                    {skill.skillDetails?.name || skill.skillId}
                </Text>
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
                    {getProficiencyLabel(skill.proficiency)}
                </Text>
            </View>
            {skill.yearsExperience > 0 && (
                <Text style={styles.experience}>
                    {skill.yearsExperience} year{skill.yearsExperience > 1 ? 's' : ''} experience
                </Text>
            )}
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    removeButton: {
        padding: 8,
    },
    removeText: {
        fontSize: 18,
        color: '#FF3B30',
        fontWeight: 'bold',
    },
    details: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 10,
    },
    typeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        overflow: 'hidden',
    },
    proficiency: {
        fontSize: 14,
        color: '#666',
        paddingVertical: 4,
    },
    experience: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
});

export default SkillBadge;