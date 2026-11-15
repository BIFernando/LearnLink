import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Alert, Switch } from 'react-native';

interface SkillManagementScreenProps { navigation?: any; }
interface Category { id: string; name: string; icon: string; }
interface Proficiency { id: string; label: string; desc: string; level: number; }

const SkillManagementScreen: React.FC<SkillManagementScreenProps> = ({ navigation = null }) => {
    const [exchangeType, setExchangeType] = useState<string>('OFFER');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [skillName, setSkillName] = useState<string>('');
    const [proficiency, setProficiency] = useState<string>('BEGINNER');
    const [bio, setBio] = useState<string>('');
    const [inPerson, setInPerson] = useState<boolean>(true);
    const [virtual, setVirtual] = useState<boolean>(false);

    const categories: Category[] = [
        { id: 'tech', name: 'Tech & Code', icon: '💻' },
        { id: 'design', name: 'Design & UI', icon: '🎨' },
        { id: 'lang', name: 'Languages', icon: '🌍' },
        { id: 'business', name: 'Business', icon: '📊' },
        { id: 'media', name: 'Media', icon: '🎬' },
        { id: 'other', name: 'Other', icon: '📦' },
    ];

    const proficiencyLevels: Proficiency[] = [
        { id: 'BEGINNER', label: 'Beginner', desc: 'Learning fundamentals', level: 1 },
        { id: 'INTERMEDIATE', label: 'Intermediate', desc: 'Comfortable building projects', level: 2 },
        { id: 'ADVANCED', label: 'Advanced', desc: 'Deep technical mastery', level: 3 },
        { id: 'EXPERT', label: 'Expert', desc: 'Professional experience', level: 4 },
    ];

    const goBack = (): void => {
        if (navigation && typeof navigation.goBack === 'function') { navigation.goBack(); }
        else { Alert.alert('Navigation', 'Would go back'); }
    };

    const handleSave = (): void => {
        if (!skillName.trim()) { Alert.alert('Missing Info', 'Please enter a skill name'); return; }
        if (!selectedCategory) { Alert.alert('Missing Info', 'Please select a category'); return; }
        Alert.alert('✅ Skill Saved!', 'Skill: ' + skillName, [{ text: 'OK', onPress: goBack }]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Add New Skill</Text>
                    <Text style={styles.headerSubtitle}>Offer peer expertise</Text>
                </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.label}>Exchange Type</Text>
                    <View style={styles.typeContainer}>
                        <TouchableOpacity style={[styles.typeButton, exchangeType === 'OFFER' && styles.typeButtonActiveGreen]} onPress={() => setExchangeType('OFFER')}>
                            <Text style={styles.typeIcon}>🎓</Text>
                            <Text style={[styles.typeTitle, exchangeType === 'OFFER' && styles.typeTitleActive]}>Offering to Teach</Text>
                            <Text style={[styles.typeSubtitle, exchangeType === 'OFFER' && styles.typeSubtitleActive]}>Offer peer expertise</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.typeButton, exchangeType === 'WANT' && styles.typeButtonActivePurple]} onPress={() => setExchangeType('WANT')}>
                            <Text style={styles.typeIcon}>💡</Text>
                            <Text style={[styles.typeTitle, exchangeType === 'WANT' && styles.typeTitleActive]}>Looking to Learn</Text>
                            <Text style={[styles.typeSubtitle, exchangeType === 'WANT' && styles.typeSubtitleActive]}>Wanted peer skills</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={styles.label}>Skill Category</Text>
                    <View style={styles.categoriesGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity key={cat.id} style={[styles.categoryChip, selectedCategory?.id === cat.id && styles.categoryChipActive]} onPress={() => setSelectedCategory(cat)}>
                                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                <Text style={[styles.categoryText, selectedCategory?.id === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={styles.label}>Skill Focus Name</Text>
                    <TextInput style={styles.input} placeholder="e.g., Python for Data Analysis" placeholderTextColor="#999" value={skillName} onChangeText={setSkillName} maxLength={60} />
                </View>
                <View style={styles.section}>
                    <Text style={styles.label}>Your Proficiency Level</Text>
                    {proficiencyLevels.map((level) => (
                        <TouchableOpacity key={level.id} style={[styles.proficiencyRow, proficiency === level.id && styles.proficiencyRowActive]} onPress={() => setProficiency(level.id)}>
                            <View style={styles.proficiencyLeft}>
                                <View style={[styles.radioCircle, proficiency === level.id && styles.radioCircleActive]}>
                                    {proficiency === level.id && <View style={styles.radioInner} />}
                                </View>
                                <View>
                                    <Text style={[styles.proficiencyLabel, proficiency === level.id && styles.proficiencyLabelActive]}>{level.label}</Text>
                                    <Text style={styles.proficiencyDesc}>{level.desc}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.section}>
                    <Text style={styles.label}>Short Bio</Text>
                    <TextInput style={[styles.input, styles.textArea]} placeholder="Sessions at the campus library..." placeholderTextColor="#999" value={bio} onChangeText={setBio} multiline numberOfLines={3} maxLength={200} />
                </View>
                <View style={styles.section}>
                    <Text style={styles.label}>Available Formats</Text>
                    <View style={styles.formatRow}>
                        <Text style={styles.formatIcon}>📍</Text>
                        <Text style={styles.formatTitle}>In-person on campus</Text>
                        <Switch value={inPerson} onValueChange={setInPerson} />
                    </View>
                    <View style={styles.formatRow}>
                        <Text style={styles.formatIcon}>💻</Text>
                        <Text style={styles.formatTitle}>Virtual / Remote</Text>
                        <Switch value={virtual} onValueChange={setVirtual} />
                    </View>
                </View>
                <View style={styles.buttonSection}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveButtonText}>Save & Publish Skill</Text></TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' },
    backIcon: { fontSize: 20, color: '#1A1A2E' },
    headerTextContainer: { marginLeft: 12 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A2E' },
    headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
    section: { paddingHorizontal: 20, marginTop: 20 },
    label: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
    typeContainer: { flexDirection: 'row', gap: 12 },
    typeButton: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E0E0E0' },
    typeButtonActiveGreen: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    typeButtonActivePurple: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
    typeIcon: { fontSize: 24, marginBottom: 8 },
    typeTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E' },
    typeTitleActive: { color: '#fff' },
    typeSubtitle: { fontSize: 11, color: '#666', marginTop: 4 },
    typeSubtitleActive: { color: '#F0F0F0' },
    categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0' },
    categoryChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
    categoryIcon: { fontSize: 16, marginRight: 6 },
    categoryText: { fontSize: 13, fontWeight: '600', color: '#666' },
    categoryTextActive: { color: '#fff' },
    input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E0E0E0' },
    textArea: { height: 90, textAlignVertical: 'top' },
    proficiencyRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: '#E0E0E0' },
    proficiencyRowActive: { borderColor: '#6C63FF', backgroundColor: '#F5F3FF' },
    proficiencyLeft: { flexDirection: 'row', alignItems: 'center' },
    radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    radioCircleActive: { borderColor: '#6C63FF' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6C63FF' },
    proficiencyLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
    proficiencyLabelActive: { color: '#6C63FF' },
    proficiencyDesc: { fontSize: 12, color: '#666', marginTop: 2 },
    formatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
    formatIcon: { fontSize: 18, marginRight: 12 },
    formatTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
    buttonSection: { paddingHorizontal: 20, marginTop: 30, marginBottom: 40 },
    saveButton: { backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SkillManagementScreen;
