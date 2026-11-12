import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, Image, Alert,
} from 'react-native';

const StudentProfileScreen = ({ route, navigation = null }) => {
    // Get userId from route params or use default
    const userId = route?.params?.userId || 'demo-user-1';

    // Demo student data (will be replaced with Firebase data later)
    const student = {
        userId: 'demo-user-1',
        displayName: 'David Kim',
        department: 'Computer Science',
        year: 'Senior 2025',
        location: 'Stanford Hall · North Campus',
        email: 'david.kim@stanford.edu',
        profilePhotoUrl: 'https://i.pravatar.cc/300?img=33',
        isVerified: true,
        level: 4,
        completedSwaps: 42,
        ratingAverage: 4.95,
        ratingCount: 28,
        matchScore: 98,
        matchDescription: 'David wants your Figma Design skills and is offering the exact Python Data skills you need!',
    };

    // Skills offered
    const skillsOffered = [
        {
            id: 'skill-1',
            name: 'Python, Pandas & Automation',
            level: 'EXPERT',
            verification: '5/5 Code Review Score',
            description: 'Data wrangling, script automation, API integrations, and algorithmic problem solving.',
        },
        {
            id: 'skill-2',
            name: 'Git & Version Control',
            level: 'ADVANCED',
            verification: null,
            description: 'Branching strategies, conflict resolution, rebase mastery, and automated CI workflows.',
        },
    ];

    // Skills wanted
    const skillsWanted = [
        'Figma UI/UX (You Offer)',
        'Public Speaking',
        'Resume Critique',
    ];

    // Reviews
    const reviews = [
        {
            id: 'review-1',
            reviewer: 'Jessica T.',
            reviewerRole: 'Junior, Economics',
            rating: 5,
            comment: 'David helped me debug my term project in 1 hour. Super patient and explained algorithms simply! Swapped for microeconomics notes.',
            exchange: 'Exchanged Python for Econ Theory',
            date: '3 days ago',
            avatar: 'https://i.pravatar.cc/100?img=45',
        },
        {
            id: 'review-2',
            reviewer: 'Marcus L.',
            reviewerRole: 'Sophomore, CS',
            rating: 5,
            comment: 'Best mentor on campus! David taught me Git workflows in 45 minutes. Highly recommend!',
            exchange: 'Exchanged Git for Calculus',
            date: '1 week ago',
            avatar: 'https://i.pravatar.cc/100?img=52',
        },
    ];

    // Availability
    const availability = {
        days: 'Tue & Thu 4-7 PM, Sat mornings',
        location: 'Prefers Green Library 2nd Floor or Zoom',
    };

    const goBack = () => {
        if (navigation) {
            navigation.goBack();
        } else {
            Alert.alert('Navigation', 'Would go back to previous screen');
        }
    };

    const handleConnect = () => {
        Alert.alert(
            '💌 Send Exchange Request',
            `Would you like to send an exchange request to ${student.displayName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Request',
                    onPress: () => {
                        Alert.alert(
                            '✅ Request Sent!',
                            `${student.displayName} will receive your exchange request.`,
                        );
                    },
                },
            ]
        );
    };

    const handleSeeAllReviews = () => {
        Alert.alert('Reviews', `Showing all ${student.ratingCount} reviews (coming soon)`);
    };

    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '★';
        return stars;
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Student Profile</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Match Banner */}
                <View style={styles.matchBanner}>
                    <Text style={styles.matchBannerTitle}>
                        🎯 {student.matchScore}% MATCH WITH YOU
                    </Text>
                    <Text style={styles.matchBannerText}>
                        {student.matchDescription}
                    </Text>
                </View>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: student.profilePhotoUrl }}
                            style={styles.profileAvatar}
                        />
                        {student.isVerified && (
                            <View style={styles.verifiedBadgeCircle}>
                                <Text style={styles.verifiedCheck}>✓</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{student.displayName}</Text>
                        <Text style={styles.profileRole}>
                            {student.department}, {student.year}
                        </Text>
                        <Text style={styles.profileLocation}>
                            📍 {student.location}
                        </Text>
                    </View>
                </View>

                {/* Verified Info */}
                {student.isVerified && (
                    <View style={styles.verifiedRow}>
                        <View style={styles.verifiedShield}>
                            <Text style={styles.shieldIcon}>🛡️</Text>
                        </View>
                        <View>
                            <Text style={styles.verifiedLabel}>VERIFIED STUDENT</Text>
                            <Text style={styles.verifiedEmail}>{student.email}</Text>
                        </View>
                    </View>
                )}

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statIcon}>🏅</Text>
                        <Text style={styles.statValue}>LVL {student.level}</Text>
                        <Text style={styles.statLabel}>Tutor</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statIcon}>🔄</Text>
                        <Text style={styles.statValue}>{student.completedSwaps}+</Text>
                        <Text style={styles.statLabel}>Swaps</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statIcon}>⭐</Text>
                        <Text style={styles.statValue}>{student.ratingAverage}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statIcon}>💬</Text>
                        <Text style={styles.statValue}>{student.ratingCount}</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                </View>

                {/* Skills Offered */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Skills Offered</Text>
                        <View style={styles.verifiedTag}>
                            <Text style={styles.verifiedTagText}>
                                ✓ {skillsOffered.length} Verified
                            </Text>
                        </View>
                    </View>

                    {skillsOffered.map((skill) => (
                        <View key={skill.id} style={styles.skillCard}>
                            <View style={styles.skillCardHeader}>
                                <Text style={styles.skillCardName}>{skill.name}</Text>
                                <View style={[
                                    styles.levelBadge,
                                    skill.level === 'EXPERT' && styles.levelBadgeExpert,
                                ]}>
                                    <Text style={styles.levelBadgeText}>
                                        ★ {skill.level}
                                    </Text>
                                </View>
                            </View>
                            {skill.verification && (
                                <View style={styles.verificationRow}>
                                    <Text style={styles.verificationIcon}>✓</Text>
                                    <Text style={styles.verificationText}>
                                        {skill.verification}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.skillCardDescription}>
                                {skill.description}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Skills Wanted */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Skills Wanted</Text>
                    <Text style={styles.sectionSubtitle}>Looking to learn</Text>

                    <View style={styles.wantedSkillsContainer}>
                        {skillsWanted.map((skill, index) => (
                            <View key={index} style={styles.wantedSkillTag}>
                                <Text style={styles.wantedSkillText}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Weekly Availability */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Weekly Availability</Text>
                    <View style={styles.availabilityCard}>
                        <View style={styles.availabilityRow}>
                            <Text style={styles.availabilityIcon}>🕐</Text>
                            <Text style={styles.availabilityText}>
                                {availability.days}
                            </Text>
                        </View>
                        <View style={styles.availabilityRow}>
                            <Text style={styles.availabilityIcon}>📍</Text>
                            <Text style={styles.availabilityText}>
                                {availability.location}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Peer Reviews */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Peer Reviews</Text>
                        <TouchableOpacity onPress={handleSeeAllReviews}>
                            <Text style={styles.seeAllText}>
                                See all ({student.ratingCount})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {reviews.map((review) => (
                        <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                <Image
                                    source={{ uri: review.avatar }}
                                    style={styles.reviewAvatar}
                                />
                                <View style={styles.reviewInfo}>
                                    <Text style={styles.reviewerName}>
                                        {review.reviewer}
                                    </Text>
                                    <Text style={styles.reviewerRole}>
                                        {review.reviewerRole}
                                    </Text>
                                </View>
                                <Text style={styles.reviewStars}>
                                    {renderStars(review.rating)}
                                </Text>
                            </View>
                            <Text style={styles.reviewComment}>
                                "{review.comment}"
                            </Text>
                            <View style={styles.reviewFooter}>
                                <Text style={styles.reviewExchange}>
                                    {review.exchange}
                                </Text>
                                <Text style={styles.reviewDate}>
                                    · {review.date}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Connect Button */}
                <View style={styles.buttonSection}>
                    <TouchableOpacity
                        style={styles.connectButton}
                        onPress={handleConnect}
                    >
                        <Text style={styles.connectButtonText}>
                            💌 Send Exchange Request
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F7FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: { fontSize: 20, color: '#1A1A2E' },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A2E',
    },

    // Match Banner
    matchBanner: {
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 4,
    },
    matchBannerTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#6C63FF',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    matchBannerText: {
        fontSize: 13,
        color: '#4B4B6A',
        lineHeight: 18,
    },

    // Profile Header
    profileHeader: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    profileAvatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#EDE9FE',
    },
    verifiedBadgeCircle: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    verifiedCheck: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    profileName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A2E',
    },
    profileRole: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    profileLocation: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
    },

    // Verified Row
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F5F3FF',
        marginBottom: 12,
        marginHorizontal: 20,
        borderRadius: 12,
    },
    verifiedShield: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#6C63FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    shieldIcon: {
        fontSize: 18,
    },
    verifiedLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6C63FF',
        letterSpacing: 0.5,
    },
    verifiedEmail: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 18,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1A2E',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#F0F0F0',
    },

    // Sections
    section: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A2E',
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: -6,
        marginBottom: 10,
    },
    seeAllText: {
        fontSize: 13,
        color: '#6C63FF',
        fontWeight: '600',
    },
    verifiedTag: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedTagText: {
        fontSize: 11,
        color: '#2E7D32',
        fontWeight: '700',
    },

    // Skill Cards
    skillCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    skillCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    skillCardName: {
        flex: 1,
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1A1A2E',
        marginRight: 8,
    },
    levelBadge: {
        backgroundColor: '#F0F0FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    levelBadgeExpert: {
        backgroundColor: '#6C63FF',
    },
    levelBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.5,
    },
    verificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    verificationIcon: {
        fontSize: 12,
        color: '#4CAF50',
        marginRight: 6,
        fontWeight: 'bold',
    },
    verificationText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
    },
    skillCardDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginTop: 4,
    },

    // Wanted Skills
    wantedSkillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    wantedSkillTag: {
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    wantedSkillText: {
        fontSize: 13,
        color: '#6C63FF',
        fontWeight: '600',
    },

    // Availability
    availabilityCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    availabilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    availabilityIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    availabilityText: {
        fontSize: 14,
        color: '#1A1A2E',
        flex: 1,
    },

    // Reviews
    reviewCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    reviewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    reviewInfo: {
        flex: 1,
        marginLeft: 10,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1A1A2E',
    },
    reviewerRole: {
        fontSize: 12,
        color: '#666',
        marginTop: 1,
    },
    reviewStars: {
        fontSize: 14,
        color: '#FFB800',
    },
    reviewComment: {
        fontSize: 13,
        color: '#333',
        lineHeight: 19,
        fontStyle: 'italic',
        marginBottom: 10,
    },
    reviewFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewExchange: {
        fontSize: 11,
        color: '#6C63FF',
        fontWeight: '600',
    },
    reviewDate: {
        fontSize: 11,
        color: '#999',
        marginLeft: 4,
    },

    // Connect Button
    buttonSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    connectButton: {
        backgroundColor: '#6C63FF',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default StudentProfileScreen;