import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Image, Alert } from 'react-native';

const StudentProfileScreen: React.FC<any> = ({ navigation = null }) => {
    const goBack = () => { if (navigation) navigation.goBack(); };
    const handleConnect = () => { Alert.alert('💌 Send Request', 'Send request to David Kim?'); };
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={goBack}><Text style={styles.backIcon}>←</Text></TouchableOpacity><Text style={styles.headerTitle}>Student Profile</Text></View>
            <ScrollView>
                <View style={styles.matchBanner}><Text style={styles.matchText}>🎯 98% MATCH WITH YOU</Text></View>
                <View style={styles.profileRow}><Image source={{uri: 'https://i.pravatar.cc/100?img=33'}} style={styles.bigAvatar} /><View style={{flex: 1, marginLeft: 12}}><Text style={styles.name}>David Kim</Text><Text style={styles.role}>Computer Science, Senior 2025</Text><Text style={styles.loc}>📍 Stanford Hall</Text></View></View>
                <View style={styles.verifiedBox}><Text style={styles.verifiedText}>🛡️ VERIFIED STUDENT</Text></View>
                <View style={styles.statsBox}><Text style={styles.statsText}>🏅 LVL 4   🔄 42+ Swaps   ⭐ 4.95   💬 28 Reviews</Text></View>
                <Text style={styles.sectionTitle}>Skills Offered</Text>
                <View style={styles.card}><Text style={styles.skillName}>Python, Pandas & Automation</Text><Text style={styles.expertBadge}>★ EXPERT</Text><Text style={styles.desc}>Data wrangling, script automation, API integrations, and algorithmic problem solving.</Text></View>
                <Text style={styles.sectionTitle}>Skills Wanted</Text>
                <Text style={styles.wantedText}>Figma UI/UX (You Offer) · Public Speaking · Resume Critique</Text>
                <Text style={styles.sectionTitle}>Peer Reviews</Text>
                <View style={styles.card}><Text style={styles.skillName}>Jessica T.</Text><Text style={styles.stars}>⭐⭐⭐⭐⭐</Text><Text style={styles.desc}>"David helped me debug my term project in 1 hour. Super patient!"</Text></View>
                <TouchableOpacity style={styles.btn} onPress={handleConnect}><Text style={styles.btnText}>💌 Send Exchange Request</Text></TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' }, backIcon: { fontSize: 20, marginRight: 15 }, headerTitle: { fontSize: 20, fontWeight: 'bold' }, matchBanner: { backgroundColor: '#EDE9FE', padding: 16, alignItems: 'center' }, matchText: { color: '#6C63FF', fontWeight: 'bold', fontSize: 14 }, profileRow: { flexDirection: 'row', padding: 20, backgroundColor: '#fff', alignItems: 'center' }, bigAvatar: { width: 80, height: 80, borderRadius: 40 }, name: { fontSize: 22, fontWeight: 'bold' }, role: { fontSize: 13, color: '#666' }, loc: { fontSize: 12, color: '#999', marginTop: 4 }, verifiedBox: { backgroundColor: '#F5F3FF', margin: 20, marginTop: 0, padding: 12, borderRadius: 12, alignItems: 'center' }, verifiedText: { color: '#6C63FF', fontWeight: 'bold', fontSize: 12 }, statsBox: { backgroundColor: '#fff', marginHorizontal: 20, padding: 16, borderRadius: 16, alignItems: 'center' }, statsText: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E' }, sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginTop: 24, marginBottom: 12 }, card: { backgroundColor: '#fff', marginHorizontal: 20, padding: 16, borderRadius: 16, marginBottom: 12 }, skillName: { fontSize: 16, fontWeight: 'bold' }, expertBadge: { color: '#6C63FF', fontSize: 12, fontWeight: 'bold', marginTop: 4 }, desc: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 18 }, wantedText: { marginHorizontal: 20, fontSize: 14, color: '#6C63FF', fontWeight: '600', lineHeight: 22 }, stars: { fontSize: 14, color: '#FFB800', marginTop: 4, marginBottom: 8 }, btn: { backgroundColor: '#6C63FF', margin: 20, padding: 16, borderRadius: 14, alignItems: 'center' }, btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
export default StudentProfileScreen;
