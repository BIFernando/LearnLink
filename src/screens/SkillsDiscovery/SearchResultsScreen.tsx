import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';

const SearchResultsScreen: React.FC<any> = ({ navigation = null }) => {
    const goBack = () => { if (navigation) navigation.goBack(); };
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={goBack}><Text style={styles.backIcon}>←</Text></TouchableOpacity><Text style={styles.headerTitle}>2 Python Mentors</Text></View>
            <ScrollView>
                <View style={styles.filterRow}><Text style={styles.filterChip}>Python</Text><Text style={styles.filterChip}>Available Weekends</Text></View>
                <View style={styles.card}>
                    <View style={styles.userRow}><Image source={{uri: 'https://i.pravatar.cc/100?img=11'}} style={styles.avatar} /><View><Text style={styles.name}>Liam Vance</Text><Text style={styles.role}>Senior · Software Engineer</Text></View></View>
                    <Text style={styles.teachBadge}>TEACHES</Text><Text style={styles.skillText}>Python & Data Analysis</Text>
                    <TouchableOpacity style={styles.btn}><Text style={styles.btnText}>Connect</Text></TouchableOpacity>
                </View>
                <View style={styles.card}>
                    <View style={styles.userRow}><Image source={{uri: 'https://i.pravatar.cc/100?img=5'}} style={styles.avatar} /><View><Text style={styles.name}>Sarah Jenkins</Text><Text style={styles.role}>Sophomore · AI & Data Science</Text><Text style={styles.rating}>★ 4.8 (9 swaps)</Text></View></View>
                    <Text style={styles.teachBadge}>TEACHES</Text><Text style={styles.skillText}>Python Basics & Django</Text>
                    <Text style={styles.wantBadge}>WANTS</Text><Text style={styles.skillText}>Spanish Conversation Prep</Text>
                    <Text style={styles.availability}>🕐 Available Weekends</Text>
                    <TouchableOpacity style={styles.btn}><Text style={styles.btnText}>Connect</Text></TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' }, backIcon: { fontSize: 20, marginRight: 15 }, headerTitle: { fontSize: 20, fontWeight: 'bold' }, filterRow: { flexDirection: 'row', padding: 20, gap: 10 }, filterChip: { backgroundColor: '#EDE9FE', color: '#6C63FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' }, card: { backgroundColor: '#fff', margin: 20, marginTop: 0, padding: 16, borderRadius: 16 }, userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 }, name: { fontSize: 18, fontWeight: 'bold' }, role: { fontSize: 12, color: '#666' }, rating: { fontSize: 12, color: '#FFB800', marginTop: 4, fontWeight: 'bold' }, teachBadge: { backgroundColor: '#E8F5E9', color: '#2E7D32', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: 'bold', overflow: 'hidden', marginBottom: 6 }, wantBadge: { backgroundColor: '#FCE4EC', color: '#C2185B', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: 'bold', overflow: 'hidden', marginBottom: 6, marginTop: 8 }, skillText: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 }, availability: { fontSize: 12, color: '#666', marginTop: 8 }, btn: { backgroundColor: '#6C63FF', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 }, btnText: { color: '#fff', fontWeight: 'bold' },
});
export default SearchResultsScreen;
