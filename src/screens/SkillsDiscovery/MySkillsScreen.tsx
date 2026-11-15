import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';

const MySkillsScreen: React.FC<any> = ({ navigation = null }) => {
    const [activeTab, setActiveTab] = useState<string>('OFFER');
    const goTo = (screen: string) => { if (navigation) navigation.navigate(screen); };
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <View><Text style={styles.headerTitle}>My Skills</Text><Text style={styles.headerSubtitle}>2 Offered · 2 Wanted · 18 Reviews</Text></View>
                    <View style={styles.ratingBadge}><Text style={styles.ratingBadgeText}>★ 4.9</Text></View>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}><Text style={styles.statValue}>12</Text><Text style={styles.statLabel}>Swaps</Text></View>
                    <View style={styles.statCard}><Text style={styles.statValue}>32 Hrs</Text><Text style={styles.statLabel}>Time</Text></View>
                    <View style={styles.statCard}><Text style={styles.statValue}>100%</Text><Text style={styles.statLabel}>Completion</Text></View>
                </View>
                <TouchableOpacity style={styles.addSkillButton} onPress={() => goTo('SkillManagement')}><Text style={styles.addSkillIcon}>+</Text><Text style={styles.addSkillText}>Add New Skill Listing</Text></TouchableOpacity>
                <View style={styles.tabsContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'OFFER' && styles.tabActive]} onPress={() => setActiveTab('OFFER')}><Text style={[styles.tabText, activeTab === 'OFFER' && styles.tabTextActive]}>Skills I Offer</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'WANT' && styles.tabActive]} onPress={() => setActiveTab('WANT')}><Text style={[styles.tabText, activeTab === 'WANT' && styles.tabTextActive]}>Skills I Want</Text></TouchableOpacity>
                </View>
                {activeTab === 'OFFER' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Active Mentorship Offerings</Text>
                        <TouchableOpacity style={styles.skillCard}>
                            <View style={styles.skillCardTop}><View style={styles.levelBadge}><Text style={styles.levelBadgeText}>ADVANCED</Text></View><Text style={styles.liveText}>● LIVE</Text></View>
                            <Text style={styles.skillName}>UI/UX Design & Figma</Text>
                            <Text style={styles.portfolioLink}>🔗 portfolio.me/designs</Text>
                            <Text style={styles.verification}>✓ 3 verified case studies</Text>
                            <View style={styles.skillStats}><Text style={styles.skillStatsText}>8 Swaps</Text><Text style={styles.skillStatsText}>5.0 (8)</Text><Text style={styles.acceptingText}>Accepting</Text></View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.skillCard}>
                            <View style={styles.skillCardTop}><View style={[styles.levelBadge, {backgroundColor: '#2196F3'}]}><Text style={styles.levelBadgeText}>INTERMEDIATE</Text></View></View>
                            <Text style={styles.skillName}>Adobe Photoshop & Photo Editing</Text>
                            <View style={styles.skillStats}><Text style={styles.skillStatsText}>4 Swaps</Text><Text style={styles.skillStatsText}>4.8 (5)</Text><Text style={styles.activeText}>Active</Text></View>
                        </TouchableOpacity>
                    </View>
                )}
                {activeTab === 'WANT' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Skills I Want to Learn</Text>
                        <View style={styles.wantedCard}><Text style={styles.wantedName}>🐍 Python Scripting</Text><Text style={styles.wantedTarget}>Automation & Data analysis</Text></View>
                        <View style={styles.wantedCard}><Text style={styles.wantedName}>🎸 Beginner Acoustic Guitar</Text><Text style={styles.wantedTarget}>Chord transitions & Fingerpicking</Text></View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' }, headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1A1A2E' }, headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 }, ratingBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }, ratingBadgeText: { fontSize: 15, fontWeight: 'bold', color: '#FF6B00' }, statsContainer: { flexDirection: 'row', padding: 20, gap: 10 }, statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center' }, statValue: { fontSize: 20, fontWeight: 'bold', color: '#6C63FF' }, statLabel: { fontSize: 10, color: '#666', marginTop: 4 }, addSkillButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6C63FF', marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 14 }, addSkillIcon: { color: '#fff', fontSize: 22, marginRight: 10 }, addSkillText: { color: '#fff', fontSize: 15, fontWeight: '600' }, tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 }, tab: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' }, tabActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' }, tabText: { fontSize: 13, fontWeight: '600', color: '#666' }, tabTextActive: { color: '#fff' }, tabContent: { paddingHorizontal: 20 }, sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 12 }, skillCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }, skillCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }, levelBadge: { backgroundColor: '#6C63FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }, levelBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }, liveText: { color: '#4CAF50', fontSize: 10, fontWeight: 'bold' }, skillName: { fontSize: 17, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 6 }, portfolioLink: { fontSize: 13, color: '#6C63FF', marginBottom: 6 }, verification: { fontSize: 12, color: '#4CAF50', marginBottom: 12 }, skillStats: { flexDirection: 'row', gap: 12 }, skillStatsText: { fontSize: 12, color: '#666' }, acceptingText: { fontSize: 12, color: '#4CAF50', fontWeight: 'bold' }, activeText: { fontSize: 12, color: '#6C63FF', fontWeight: 'bold' }, wantedCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10 }, wantedName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' }, wantedTarget: { fontSize: 12, color: '#666', marginTop: 4 },
});
export default MySkillsScreen;
