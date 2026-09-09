import React, { useState, useCallback } from 'react';
import { 
    View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, RefreshControl, SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StudentCard from '../../components/SkillComponents/StudentCard';
import { searchStudents } from '../../services/skillService';

const DiscoverScreen = ({ navigation }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState(null);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const results = await searchStudents({
                searchText: searchText || undefined,
                type: filterType || undefined,
            });
            setStudents(results);
        } catch (error) {
            console.error('Error loading students:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadStudents();
        }, [])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadStudents();
        setRefreshing(false);
    };

    const renderStudent = ({ item }) => (
        <StudentCard 
            student={item}
            onPress={() => navigation.navigate('StudentProfile', { userId: item.userId })}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, skill, or bio..."
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={loadStudents}
                />
                <TouchableOpacity style={styles.searchButton} onPress={loadStudents}>
                    <Text style={styles.searchButtonText}>🔍</Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.filterContainer}>
                <TouchableOpacity 
                    style={[styles.filterButton, filterType === null && styles.filterActive]}
                    onPress={() => {
                        setFilterType(null);
                        loadStudents();
                    }}
                >
                    <Text style={[styles.filterText, filterType === null && styles.filterTextActive]}>
                        All
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.filterButton, filterType === 'OFFER' && styles.filterActive]}
                    onPress={() => {
                        setFilterType('OFFER');
                        loadStudents();
                    }}
                >
                    <Text style={[styles.filterText, filterType === 'OFFER' && styles.filterTextActive]}>
                        📤 Teaching
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.filterButton, filterType === 'WANT' && styles.filterActive]}
                    onPress={() => {
                        setFilterType('WANT');
                        loadStudents();
                    }}
                >
                    <Text style={[styles.filterText, filterType === 'WANT' && styles.filterTextActive]}>
                        📥 Learning
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Finding students...</Text>
                </View>
            ) : (
                <FlatList
                    data={students}
                    renderItem={renderStudent}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🔍</Text>
                            <Text style={styles.emptyTitle}>No Students Found</Text>
                            <Text style={styles.emptyText}>Try adjusting your search</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
    },
    searchButton: {
        marginLeft: 10,
        backgroundColor: '#2196F3',
        borderRadius: 25,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonText: {
        fontSize: 20,
    },
    filterContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
    },
    filterActive: {
        backgroundColor: '#2196F3',
    },
    filterText: {
        fontSize: 14,
        color: '#666',
    },
    filterTextActive: {
        color: '#fff',
    },
    listContainer: {
        paddingVertical: 8,
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyEmoji: {
        fontSize: 50,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
});

export default DiscoverScreen;