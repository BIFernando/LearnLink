import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
    SafeAreaView, Image, Alert,
} from 'react-native';

const DiscoverScreen = ({ navigation = null }) => {
    const [searchText, setSearchText] = useState('');

    // Categories data
    const disciplines = [
        { name: 'Tech & Code', icon: '💻', color: '#E3F2FD' },
        { name: 'Design & UI', icon: '🎨', color: '#FCE4EC' },
        { name: 'Languages', icon: '🌍', color: '#E8F5E9' },
        { name: 'Business', icon: '📊', color: '#FFF3E0' },
    ];

    // Trending skills
    const trendingSkills = [
        { name: 'Python', peers: 142, icon: '🐍' },
        { name: 'Figma Design', peers: 98, icon: '🎨' },
        { name: 'Conversational Spanish', peers: 76, icon: '🇪🇸' },
        { name: 'Organic Chem', peers: 54, icon: '🧪' },
    ];

    // Nearby tutors
    const nearbyTutors = [
        {
            id: '1',
            name: 'Maya Chen',
            role: 'Junior, Design',
            offering: 'UI/UX & Figma Expert',
            seeking: 'Intro to Python',
            distance: '0.4 miles',
            location: 'Campus Library',
        },
        {
            id: '2',
            name: 'Liam K.',
            role: 'Sophomore, Pre-Med',
            offering: 'Organic Chem I & II Advanced',
            seeking: 'Guitar Chords / Music Theory',
            distance: '0.7 miles',
            location: 'Science Quad Cafe',
        },
    ];

    // Safe navigation helper
   const goTo = (screen, params) => {
    try {
        if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate(screen, params);
        } else {
            Alert.alert('Navigation', `This would navigate to: ${screen}`);
        }
    } catch (error) {
        console.log('Navigation error:', error);
        Alert.alert('Navigation', `This would navigate to: ${screen}`);
    }
};

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* HEADER */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Campus Swap Hub</Text>
                    <Text style={styles.headerSubtitle}>
                        What do you want to learn or teach today?
                    </Text>
                </View>

                {/* SEARCH BAR */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Try 'Python', 'Calculus', 'Guitar'..."
                        placeholderTextColor="#999"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* HIGH MATCH ALERT */}
                <View style={styles.alertCard}>
                    <View style={styles.alertTopRow}>
                        <Text style={styles.alertTitle}>🔥 HIGH MATCH ALERT!</Text>
                        <View style={styles.matchBadge}>
                            <Text style={styles.matchBadgeText}>96% Match</Text>
                        </View>
                    </View>

                    <View style={styles.alertContent}>
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/100?img=12' }}
                            style={styles.alertAvatar}
                        />
                        <View style={styles.alertInfo}>
                            <Text style={styles.alertName}>
                                Alex R. • CS Major (Junior)
                            </Text>
                            <Text style={styles.alertDescription}>
                                Alex teaches <Text style={styles.highlightGreen}>Python</Text> and wants your{' '}
                                <Text style={styles.highlightPurple}>Figma UI Design</Text>!
                            </Text>
                            <Text style={styles.alertTime}>Free after 3 PM today</Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.viewMatchButton}
                        onPress={() => goTo('StudentProfile', { userId: '1' })}
                    >
                        <Text style={styles.viewMatchText}>View Match</Text>
                    </TouchableOpacity>
                </View>

                {/* EXPLORE DISCIPLINES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Explore Disciplines</Text>
                    <View style={styles.disciplinesGrid}>
                        {disciplines.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.disciplineCard, { backgroundColor: item.color }]}
                            >
                                <Text style={styles.disciplineIcon}>{item.icon}</Text>
                                <Text style={styles.disciplineName}>{item.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* TRENDING SKILLS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Trending Skills on Campus</Text>
                    <View style={styles.trendingCard}>
                        {trendingSkills.map((skill, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.trendingItem,
                                    index === trendingSkills.length - 1 && styles.trendingItemLast,
                                ]}
                            >
                                <Text style={styles.trendingIcon}>{skill.icon}</Text>
                                <Text style={styles.trendingName}>{skill.name}</Text>
                                <Text style={styles.trendingPeers}>{skill.peers} peers</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* NEARBY TUTORS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nearby Tutors & Partners</Text>
                    <Text style={styles.sectionSubtitle}>Active now around your halls</Text>

                    {nearbyTutors.map((tutor) => (
                        <TouchableOpacity
                            key={tutor.id}
                            style={styles.tutorCard}
                            onPress={() => goTo('StudentProfile', { userId: tutor.id })}
                        >
                            <Image
                                source={{ uri: `https://i.pravatar.cc/100?img=${tutor.id === '1' ? 5 : 8}` }}
                                style={styles.tutorAvatar}
                            />
                            <View style={styles.tutorInfo}>
                                <Text style={styles.tutorName}>{tutor.name}</Text>
                                <Text style={styles.tutorRole}>{tutor.role}</Text>
                                <Text style={styles.offeringText}>OFFERING {tutor.offering}</Text>
                                <Text style={styles.seekingText}>SEEKING {tutor.seeking}</Text>
                                <Text style={styles.tutorLocation}>
                                    {tutor.distance} • {tutor.location}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ADD SKILL BUTTON */}
                <TouchableOpacity
                    style={styles.addSkillButton}
                    onPress={() => goTo('SkillManagement')}
                >
                    <View style={styles.plusCircle}>
                        <Text style={styles.plusText}>+</Text>
                    </View>
                    <View style={styles.addSkillTextContainer}>
                        <Text style={styles.addSkillTitle}>Got skills to share?</Text>
                        <Text style={styles.addSkillSubtitle}>
                            List a skill in under 60 seconds
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A2E' },
    headerSubtitle: { fontSize: 15, color: '#666', marginTop: 5 },
    searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
    searchInput: {
        backgroundColor: '#fff', borderRadius: 30, paddingHorizontal: 20,
        paddingVertical: 15, fontSize: 16, color: '#333',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    alertCard: {
        backgroundColor: '#1A1A2E', marginHorizontal: 20, borderRadius: 20,
        padding: 18, marginBottom: 24,
    },
    alertTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    alertTitle: { color: '#FF6B6B', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
    matchBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
    matchBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    alertContent: { flexDirection: 'row', alignItems: 'center' },
    alertAvatar: { width: 55, height: 55, borderRadius: 27, borderWidth: 2, borderColor: '#4CAF50' },
    alertInfo: { marginLeft: 12, flex: 1 },
    alertName: { color: '#fff', fontSize: 15, fontWeight: '600' },
    alertDescription: { color: '#B0B0C0', fontSize: 13, marginTop: 4, lineHeight: 18 },
    highlightGreen: { color: '#4CAF50', fontWeight: 'bold' },
    highlightPurple: { color: '#A78BFA', fontWeight: 'bold' },
    alertTime: { color: '#4CAF50', fontSize: 12, marginTop: 6 },
    viewMatchButton: { backgroundColor: '#6C63FF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
    viewMatchText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 12 },
    sectionSubtitle: { fontSize: 14, color: '#666', marginTop: -8, marginBottom: 12 },
    disciplinesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    disciplineCard: { width: '48%', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
    disciplineIcon: { fontSize: 28, marginBottom: 8 },
    disciplineName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
    trendingCard: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16 },
    trendingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    trendingItemLast: { borderBottomWidth: 0 },
    trendingIcon: { fontSize: 20, marginRight: 12 },
    trendingName: { flex: 1, fontSize: 15, color: '#1A1A2E', fontWeight: '500' },
    trendingPeers: { fontSize: 14, color: '#6C63FF', fontWeight: '700' },
    tutorCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
        flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    tutorAvatar: { width: 65, height: 65, borderRadius: 32 },
    tutorInfo: { marginLeft: 14, flex: 1 },
    tutorName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
    tutorRole: { fontSize: 12, color: '#666', marginTop: 2 },
    offeringText: { fontSize: 12, color: '#4CAF50', fontWeight: '700', marginTop: 8 },
    seekingText: { fontSize: 12, color: '#6C63FF', fontWeight: '700', marginTop: 3 },
    tutorLocation: { fontSize: 12, color: '#999', marginTop: 6 },
    addSkillButton: { backgroundColor: '#6C63FF', marginHorizontal: 20, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' },
    plusCircle: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    plusText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -3 },
    addSkillTextContainer: { marginLeft: 16 },
    addSkillTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    addSkillSubtitle: { color: '#E0E0FF', fontSize: 12, marginTop: 3 },
});

export default DiscoverScreen;