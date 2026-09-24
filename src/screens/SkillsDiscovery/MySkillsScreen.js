import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    SafeAreaView, Image, Alert,
} from 'react-native';

const MySkillsScreen = ({ navigation = null }) => {
    const [activeTab, setActiveTab] = useState('OFFER');

    const user = {
        displayName: 'Sarah Jenkins',
        department: 'Design & Creative Arts',
        year: 'Junior',
        rating: 4.9,
        offeredCount: 2,
        wantedCount: 2,
        reviewCount: 18,
        completedSwaps: 12,
        hoursExchanged: 32,
        completionRate: 100,
    };

    const offeredSkills = [
        {
            id: 'skill-1',
            name: 'UI/UX Design & Figma',
            category: 'Design & Creative Arts',
            level: 'ADVANCED',
            experience: '3 yrs exp',
            isLive: true,
            portfolio: 'portfolio.me/designs',
            verification: '3 verified interactive case studies attached',
            swaps: 8,
            rating: 5.0,
            ratingCount: 8,
            status: 'Accepting',
            images: [
                { id: 'img-1', label: 'Design System' },
                { id: 'img-2', label: 'User Flow' },
            ],
        },
        {
            id: 'skill-2',
            name: 'Adobe Photoshop & Photo Editing',
            category: 'Intermediate Digital Media',
            level: 'INTERMEDIATE',
            experience: '2 yrs exp',
            isLive: false,
            portfolio: null,
            verification: null,
            swaps: 4,
            rating: 4.8,
            ratingCount: 5,
            status: 'Active',
            images: [
                { id: 'img-3', label: 'Color Grading & Retouching Pack' },
            ],
        },
    ];

    const wantedSkills = [
        {
            id: 'want-1',
            name: 'Python Scripting',
            target: 'Automation & Data analysis',
            matches: 14,
            icon: '🐍',
        },
        {
            id: 'want-2',
            name: 'Beginner Acoustic Guitar',
            target: 'Chord transitions & Fingerpicking',
            matches: 10,
            icon: '🎸',
        },
    ];

    const goTo = (screen, params) => {
        try {
            if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate(screen, params);
            } else {
                Alert.alert('Coming Soon', `The "${screen}" screen will be available soon!`);
            }
        } catch (error) {
            console.log('Navigation error:', error);
            Alert.alert('Coming Soon', `The "${screen}" screen will be available soon!`);
        }
    };

    const handleAddSkill = () => {
        goTo('SkillManagement');
    };

    const handleManageWishlist = () => {
        Alert.alert('Wishlist', 'Manage your wishlist (coming soon)');
    };

    const handleFindMatches = () => {
        Alert.alert('Matches', '24 potential matches found! (coming soon)');
    };

    const handleEditSkill = (skill) => {
        Alert.alert('Edit Skill', `Editing: ${skill.name}`);
    };

    const getLevelBadge = (level) => {
        const colors = {
            BEGINNER: '#4CAF50',
            INTERMEDIATE: '#2196F3',
            ADVANCED: '#6C63FF',
            EXPERT: '#FF6B6B',
        };
        return colors[level] || '#6C63FF';
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>

                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>My Skills</Text>
                        <Text style={styles.headerSubtitle}>
                            {user.offeredCount} Offered · {user.wantedCount} Wanted · {user.reviewCount} Reviews
                        </Text>
                    </View>
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingBadgeText}>★ {user.rating}</Text>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{user.completedSwaps}</Text>
                        <Text style={styles.statLabel}>Completed Swaps</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{user.hoursExchanged} Hrs</Text>
                        <Text style={styles.statLabel}>Time Exchanged</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{user.completionRate}%</Text>
                        <Text style={styles.statLabel}>Completion</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.addSkillButton}
                    onPress={handleAddSkill}
                >
                    <Text style={styles.addSkillIcon}>+</Text>
                    <Text style={styles.addSkillText}>Add New Skill Listing</Text>
                </TouchableOpacity>

                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'OFFER' && styles.tabActive]}
                        onPress={() => setActiveTab('OFFER')}
                    >
                        <Text style={[styles.tabText, activeTab === 'OFFER' && styles.tabTextActive]}>
                            Skills I Offer ({user.offeredCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'WANT' && styles.tabActive]}
                        onPress={() => setActiveTab('WANT')}
                    >
                        <Text style={[styles.tabText, activeTab === 'WANT' && styles.tabTextActive]}>
                            Skills I Want ({user.wantedCount})
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'OFFER' && (
                    <View style={styles.tabContent}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Active Mentorship Offerings</Text>
                            <Text style={styles.liveText}>● Live to campus</Text>
                        </View>

                        {offeredSkills.map((skill) => (
                            <TouchableOpacity
                                key={skill.id}
                                style={styles.skillCard}
                                onPress={() => handleEditSkill(skill)}
                            >
                                <View style={styles.skillCardTop}>
                                    <View style={styles.skillMeta}>
                                        <View style={styles.levelRow}>
                                            <View style={[
                                                styles.levelBadge,
                                                { backgroundColor: getLevelBadge(skill.level) },
                                            ]}>
                                                <Text style={styles.levelBadgeText}>{skill.level}</Text>
                                            </View>
                                            <Text style={styles.experienceText}>● {skill.experience}</Text>
                                        </View>
                                        <Text style={styles.skillCategory}>{skill.category}</Text>
                                    </View>
                                    {skill.isLive && (
                                        <View style={styles.liveBadge}>
                                            <Text style={styles.liveBadgeText}>● LIVE</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.skillName}>{skill.name}</Text>

                                {skill.portfolio && (
                                    <Text style={styles.portfolioLink}>🔗 {skill.portfolio}</Text>
                                )}

                                {skill.verification && (
                                    <Text style={styles.verificationText}>✓ {skill.verification}</Text>
                                )}

                                <View style={styles.imageRow}>
                                    {skill.images.map((img) => (
                                        <View key={img.id} style={styles.imagePlaceholder}>
                                            <Text style={styles.imagePlaceholderText}>{img.label}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.skillStats}>
                                    <Text style={styles.skillStatsText}>{skill.swaps} Swaps</Text>
                                    <Text style={styles.skillStatsDot}>●</Text>
                                    <Text style={styles.skillStatsText}>{skill.rating} ({skill.ratingCount})</Text>
                                    <Text style={styles.skillStatsDot}>●</Text>
                                    <Text style={[
                                        styles.statusText,
                                        { color: skill.status === 'Accepting' ? '#4CAF50' : '#6C63FF' },
                                    ]}>
                                        {skill.status}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {activeTab === 'WANT' && (
                    <View style={styles.tabContent}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Skills I Want to Learn ({user.wantedCount})</Text>
                            <TouchableOpacity onPress={handleManageWishlist}>
                                <Text style={styles.manageText}>Manage Wishlist</Text>
                            </TouchableOpacity>
                        </View>

                        {wantedSkills.map((skill) => (
                            <View key={skill.id} style={styles.wantedCard}>
                                <View style={styles.wantedHeader}>
                                    <Text style={styles.wantedIcon}>{skill.icon}</Text>
                                    <View style={styles.wantedInfo}>
                                        <Text style={styles.wantedName}>{skill.name}</Text>
                                        <Text style={styles.wantedTarget}>Target: {skill.target}</Text>
                                    </View>
                                    <View style={styles.matchesBadge}>
                                        <Text style={styles.matchesText}>{skill.matches} Tutors</Text>
                                    </View>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={styles.matchSuggestion}
                            onPress={handleFindMatches}
                        >
                            <Text style={styles.matchSuggestionTitle}>
                                🎯 24 Potential Campus Matches Found!
                            </Text>
                            <Text style={styles.matchSuggestionText}>
                                Peers available to trade for your design skills this week
                            </Text>
                            <View style={styles.matchSuggestionButton}>
                                <Text style={styles.matchSuggestionButtonText}>
                                    View Matches →
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1A1A2E' },
    headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
    ratingBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    },
    ratingBadgeText: { fontSize: 15, fontWeight: 'bold', color: '#FF6B00' },
    statsContainer: { flexDirection: 'row', padding: 20, gap: 10 },
    statCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
        alignItems: 'center',
    },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#6C63FF' },
    statLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
    addSkillButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#6C63FF', marginHorizontal: 20, marginBottom: 20,
        padding: 16, borderRadius: 14,
    },
    addSkillIcon: { color: '#fff', fontSize: 22, fontWeight: '300', marginRight: 10 },
    addSkillText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
    tab: {
        flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff',
        alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0',
    },
    tabActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
    tabTextActive: { color: '#fff' },
    tabContent: { paddingHorizontal: 20 },
    sectionHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
    liveText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
    manageText: { fontSize: 12, color: '#6C63FF', fontWeight: '600' },
    skillCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    skillCardTop: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 10,
    },
    skillMeta: { flex: 1 },
    levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    levelBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    experienceText: { fontSize: 11, color: '#666', fontWeight: '600' },
    skillCategory: { fontSize: 12, color: '#999', marginTop: 6 },
    liveBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    liveBadgeText: { fontSize: 10, color: '#2E7D32', fontWeight: 'bold' },
    skillName: { fontSize: 17, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 6 },
    portfolioLink: { fontSize: 13, color: '#6C63FF', fontWeight: '600', marginBottom: 6 },
    verificationText: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginBottom: 12 },
    imageRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    imagePlaceholder: {
        flex: 1, height: 80, borderRadius: 10, backgroundColor: '#EDE9FE',
        justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8,
    },
    imagePlaceholderText: { fontSize: 11, color: '#6C63FF', fontWeight: '600' },
    skillStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    skillStatsText: { fontSize: 12, color: '#666', fontWeight: '600' },
    skillStatsDot: { fontSize: 6, color: '#CCC' },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    wantedCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    wantedHeader: { flexDirection: 'row', alignItems: 'center' },
    wantedIcon: { fontSize: 28, marginRight: 12 },
    wantedInfo: { flex: 1 },
    wantedName: { fontSize: 15, fontWeight: 'bold', color: '#1A1A2E' },
    wantedTarget: { fontSize: 12, color: '#666', marginTop: 3 },
    matchesBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    matchesText: { fontSize: 12, fontWeight: 'bold', color: '#6C63FF' },
    matchSuggestion: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, marginTop: 12 },
    matchSuggestionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    matchSuggestionText: { color: '#B0B0C0', fontSize: 13, marginTop: 8, lineHeight: 18 },
    matchSuggestionButton: { marginTop: 14, alignSelf: 'flex-start' },
    matchSuggestionButtonText: { color: '#6C63FF', fontSize: 14, fontWeight: 'bold' },
});

export default MySkillsScreen;