import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
    SafeAreaView, Alert, Switch,
} from 'react-native';

const SkillManagementScreen = ({ navigation = null }) => {
    const [exchangeType, setExchangeType] = useState('OFFER');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [skillName, setSkillName] = useState('');
    const [proficiency, setProficiency] = useState('BEGINNER');
    const [bio, setBio] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [inPerson, setInPerson] = useState(true);
    const [virtual, setVirtual] = useState(false);

    const categories = [
        { id: 'tech', name: 'Tech & Code', icon: '💻' },
        { id: 'design', name: 'Design & UI', icon: '🎨' },
        { id: 'lang', name: 'Languages', icon: '🌍' },
        { id: 'business', name: 'Business', icon: '📊' },
        { id: 'media', name: 'Media', icon: '🎬' },
        { id: 'other', name: 'Other', icon: '📦' },
    ];

    const proficiencyLevels = [
        { id: 'BEGINNER', label: 'Beginner', desc: 'Learning fundamentals', level: 1 },
        { id: 'INTERMEDIATE', label: 'Intermediate', desc: 'Comfortable building projects', level: 2 },
        { id: 'ADVANCED', label: 'Advanced', desc: 'Deep technical mastery', level: 3 },
        { id: 'EXPERT', label: 'Expert', desc: 'Professional experience', level: 4 },
    ];

    const goBack = () => {
        if (navigation) {
            navigation.goBack();
        } else {
            Alert.alert('Navigation', 'Would go back to previous screen');
        }
    };

    const handleSave = () => {
        if (!skillName.trim()) {
            Alert.alert('Missing Info', 'Please enter a skill name');
            return;
        }
        if (!selectedCategory) {
            Alert.alert('Missing Info', 'Please select a category');
            return;
        }

        Alert.alert(
            '✅ Skill Saved!',
            `Skill: ${skillName}\nType: ${exchangeType === 'OFFER' ? 'Teaching' : 'Learning'}\nProficiency: ${proficiency}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Save & Go Back', 
                    onPress: () => {
                        setSkillName('');
                        setBio('');
                        setPortfolioUrl('');
                        setSelectedCategory(null);
                        setProficiency('BEGINNER');
                        goBack();
                    }
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Add New Skill</Text>
                    <Text style={styles.headerSubtitle}>
                        {exchangeType === 'OFFER' ? 'Offer peer expertise' : 'Find someone to teach you'}
                    </Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                
                <View style={styles.section}>
                    <Text style={styles.label}>Exchange Type</Text>
                    <View style={styles.typeContainer}>
                        <TouchableOpacity
                            style={[styles.typeButton, exchangeType === 'OFFER' && styles.typeButtonActiveGreen]}
                            onPress={() => setExchangeType('OFFER')}
                        >
                            <Text style={styles.typeIcon}>🎓</Text>
                            <Text style={[styles.typeTitle, exchangeType === 'OFFER' && styles.typeTitleActive]}>
                                Offering to Teach
                            </Text>
                            <Text style={[styles.typeSubtitle, exchangeType === 'OFFER' && styles.typeSubtitleActive]}>
                                Offer peer expertise
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeButton, exchangeType === 'WANT' && styles.typeButtonActivePurple]}
                            onPress={() => setExchangeType('WANT')}
                        >
                            <Text style={styles.typeIcon}>💡</Text>
                            <Text style={[styles.typeTitle, exchangeType === 'WANT' && styles.typeTitleActive]}>
                                Looking to Learn
                            </Text>
                            <Text style={[styles.typeSubtitle, exchangeType === 'WANT' && styles.typeSubtitleActive]}>
                                Wanted peer skills
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Skill Category</Text>
                    <View style={styles.categoriesGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.categoryChip, selectedCategory?.id === cat.id && styles.categoryChipActive]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                <Text style={[styles.categoryText, selectedCategory?.id === cat.id && styles.categoryTextActive]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Skill Focus Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Python for Data Analysis"
                        placeholderTextColor="#999"
                        value={skillName}
                        onChangeText={setSkillName}
                        maxLength={60}
                    />
                    <Text style={styles.charCount}>{skillName.length}/60</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Your Proficiency Level</Text>
                    <Text style={styles.helperText}>
                        LEVEL {proficiencyLevels.find(p => p.id === proficiency)?.level} OF 4
                    </Text>
                    {proficiencyLevels.map((level) => (
                        <TouchableOpacity
                            key={level.id}
                            style={[styles.proficiencyRow, proficiency === level.id && styles.proficiencyRowActive]}
                            onPress={() => setProficiency(level.id)}
                        >
                            <View style={styles.proficiencyLeft}>
                                <View style={[styles.radioCircle, proficiency === level.id && styles.radioCircleActive]}>
                                    {proficiency === level.id && <View style={styles.radioInner} />}
                                </View>
                                <View>
                                    <Text style={[styles.proficiencyLabel, proficiency === level.id && styles.proficiencyLabelActive]}>
                                        {level.label}
                                    </Text>
                                    <Text style={styles.proficiencyDesc}>{level.desc}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Short Bio & Teaching Style</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Sessions at the campus library or Google Meet..."
                        placeholderTextColor="#999"
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                    />
                    <Text style={styles.charCount}>{bio.length}/200 chars</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Verified Proof / Portfolio (Optional)</Text>
                    <View style={styles.portfolioContainer}>
                        <Text style={styles.portfolioIcon}>🔗</Text>
                        <TextInput
                            style={styles.portfolioInput}
                            placeholder="github.com/username"
                            placeholderTextColor="#999"
                            value={portfolioUrl}
                            onChangeText={setPortfolioUrl}
                            autoCapitalize="none"
                        />
                    </View>
                    <Text style={styles.helperText}>Attach certificate, repo, or Figma link</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Available Formats</Text>
                    
                    <View style={styles.formatRow}>
                        <View style={styles.formatIconContainer}>
                            <Text style={styles.formatIcon}>📍</Text>
                        </View>
                        <View style={styles.formatInfo}>
                            <Text style={styles.formatTitle}>In-person on campus</Text>
                            <Text style={styles.formatSubtitle}>Library pods, student union, quad</Text>
                        </View>
                        <Switch
                            value={inPerson}
                            onValueChange={setInPerson}
                            trackColor={{ false: '#E0E0E0', true: '#6C63FF' }}
                            thumbColor="#fff"
                        />
                    </View>

                    <View style={styles.formatRow}>
                        <View style={styles.formatIconContainer}>
                            <Text style={styles.formatIcon}>💻</Text>
                        </View>
                        <View style={styles.formatInfo}>
                            <Text style={styles.formatTitle}>Virtual / Remote</Text>
                            <Text style={styles.formatSubtitle}>Google Meet, Discord screen share</Text>
                        </View>
                        <Switch
                            value={virtual}
                            onValueChange={setVirtual}
                            trackColor={{ false: '#E0E0E0', true: '#6C63FF' }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                <View style={styles.buttonSection}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save & Publish Skill</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={goBack}>
                        <Text style={styles.cancelButtonText}>Cancel changes</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 15, paddingBottom: 20,
        backgroundColor: '#fff',
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F5F7FA',
        justifyContent: 'center', alignItems: 'center',
    },
    backIcon: { fontSize: 20, color: '#1A1A2E' },
    headerTextContainer: { marginLeft: 12, flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A2E' },
    headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
    section: { paddingHorizontal: 20, marginTop: 20 },
    label: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
    helperText: { fontSize: 12, color: '#999', marginTop: 6 },
    charCount: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 4 },
    typeContainer: { flexDirection: 'row', gap: 12 },
    typeButton: {
        flex: 1, padding: 16, borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 2, borderColor: '#E0E0E0',
    },
    typeButtonActiveGreen: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    typeButtonActivePurple: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
    typeIcon: { fontSize: 24, marginBottom: 8 },
    typeTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E' },
    typeTitleActive: { color: '#fff' },
    typeSubtitle: { fontSize: 11, color: '#666', marginTop: 4 },
    typeSubtitleActive: { color: '#F0F0F0' },
    categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 20, backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#E0E0E0',
    },
    categoryChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
    categoryIcon: { fontSize: 16, marginRight: 6 },
    categoryText: { fontSize: 13, fontWeight: '600', color: '#666' },
    categoryTextActive: { color: '#fff' },
    input: {
        backgroundColor: '#fff', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: '#1A1A2E',
        borderWidth: 1, borderColor: '#E0E0E0',
    },
    textArea: { height: 90, textAlignVertical: 'top' },
    proficiencyRow: {
        backgroundColor: '#fff', borderRadius: 12, padding: 14,
        marginBottom: 8, borderWidth: 2, borderColor: '#E0E0E0',
    },
    proficiencyRowActive: { borderColor: '#6C63FF', backgroundColor: '#F5F3FF' },
    proficiencyLeft: { flexDirection: 'row', alignItems: 'center' },
    radioCircle: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: '#E0E0E0',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    radioCircleActive: { borderColor: '#6C63FF' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6C63FF' },
    proficiencyLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
    proficiencyLabelActive: { color: '#6C63FF' },
    proficiencyDesc: { fontSize: 12, color: '#666', marginTop: 2 },
    portfolioContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12,
        paddingHorizontal: 16, borderWidth: 1, borderColor: '#E0E0E0',
    },
    portfolioIcon: { fontSize: 18, marginRight: 10 },
    portfolioInput: { flex: 1, paddingVertical: 14, fontSize: 14, color: '#1A1A2E' },
    formatRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0',
    },
    formatIconContainer: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F0F0FF',
        justifyContent: 'center', alignItems: 'center',
    },
    formatIcon: { fontSize: 18 },
    formatInfo: { flex: 1, marginLeft: 12 },
    formatTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
    formatSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
    buttonSection: { paddingHorizontal: 20, marginTop: 30 },
    saveButton: {
        backgroundColor: '#6C63FF', borderRadius: 14,
        paddingVertical: 16, alignItems: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    cancelButton: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    cancelButtonText: { color: '#666', fontSize: 14 },
});

export default SkillManagementScreen;