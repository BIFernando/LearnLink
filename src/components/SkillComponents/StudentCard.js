import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

const StudentCard = ({ student, onPress, matchScore }) => {
    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '⭐';
        return stars || '⭐';
    };

    const topSkills = student.skills?.slice(0, 3) || [];

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.header}>
                <Image 
                    source={
                        student.profilePhotoUrl 
                            ? { uri: student.profilePhotoUrl } 
                            : { uri: 'https://via.placeholder.com/60' }
                    }
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.name}>{student.displayName}</Text>
                    <Text style={styles.level}>Level {student.level || 1}</Text>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.ratingText}>
                            {renderStars(student.ratingAverage || 0)}
                        </Text>
                        <Text style={styles.ratingCount}>
                            ({student.ratingCount || 0})
                        </Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.skillsContainer}>
                {topSkills.map((skill, index) => (
                    <View 
                        key={index} 
                        style={[
                            styles.skillTag,
                            { 
                                backgroundColor: skill.type === 'OFFER' 
                                    ? '#E8F5E9' 
                                    : '#E3F2FD'
                            }
                        ]}
                    >
                        <Text style={[
                            styles.skillTagText,
                            { 
                                color: skill.type === 'OFFER' 
                                    ? '#2E7D32' 
                                    : '#1565C0'
                            }
                        ]}>
                            {skill.skillDetails?.name || 'Unknown'}
                            <Text style={styles.skillTypeIcon}>
                                {skill.type === 'OFFER' ? ' 📤' : ' 📥'}
                            </Text>
                        </Text>
                    </View>
                ))}
                {student.skills?.length > 3 && (
                    <View style={styles.moreTag}>
                        <Text style={styles.moreText}>+{student.skills.length - 3}</Text>
                    </View>
                )}
            </View>
            
            {student.bio && (
                <Text style={styles.bio} numberOfLines={2}>
                    {student.bio}
                </Text>
            )}
            
            <View style={styles.matchContainer}>
                {matchScore && (
                    <View style={styles.matchScore}>
                        <Text style={styles.matchPercentage}>{matchScore}%</Text>
                        <Text style={styles.matchLabel}>Match</Text>
                    </View>
                )}
                <View style={styles.locationContainer}>
                    <Text style={styles.location}>
                        {student.location || '📍 Location not set'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E0E0E0',
    },
    userInfo: {
        marginLeft: 12,
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    level: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    ratingText: {
        fontSize: 14,
    },
    ratingCount: {
        fontSize: 12,
        color: '#999',
        marginLeft: 4,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 6,
    },
    skillTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        marginRight: 6,
        marginBottom: 4,
    },
    skillTagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    skillTypeIcon: {
        fontSize: 12,
    },
    moreTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        marginBottom: 4,
    },
    moreText: {
        fontSize: 12,
        color: '#666',
    },
    bio: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        lineHeight: 20,
    },
    matchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    matchScore: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    matchPercentage: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1565C0',
        marginRight: 4,
    },
    matchLabel: {
        fontSize: 12,
        color: '#1565C0',
    },
    location: {
        fontSize: 12,
        color: '#999',
    },
});

export default StudentCard;