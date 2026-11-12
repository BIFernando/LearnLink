// ============================================
// FILE: src/screens/matching/MatchDetailsScreen.tsx
// SCREEN 15: Match Details (Your Figma Design)
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ScoreBadge,
  SkillTag,
} from '../../components/member3/matching-components';
import { MatchingService } from '../../config/matching.service';
import { auth } from '../../config/firebase';
import type { IMatch, IUser } from '../../../src/types/matching.types';

const matchingService = new MatchingService();

const MatchDetailsScreen: React.FC<{ route?: any; navigation?: any }> = ({ 
  route, 
  navigation 
}) => {
  const matchId = route?.params?.matchId || '';
  const currentUserId = auth.currentUser?.uid ?? 'demo-user-1';
  const [match, setMatch] = useState<IMatch | null>(null);
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMatch = async () => {
      setLoading(true);

      const matches = await matchingService.getMatches(currentUserId);
      const selectedMatch = matches.find((item) => item.matchId === matchId) ?? null;

      if (isMounted) {
        setMatch(selectedMatch);
      }

      if (selectedMatch) {
        const matchedUser = await matchingService.getUser(selectedMatch.matchedUserId);
        if (isMounted) {
          setUser(matchedUser);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    if (matchId) {
      loadMatch();
    }

    return () => {
      isMounted = false;
    };
  }, [matchId, currentUserId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Loading match details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Match not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Score Section */}
        <View style={styles.scoreContainer}>
          <ScoreBadge score={match.score} size="large" />
          <Text style={styles.scoreLabel}>Match Score</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image 
            source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.displayName}</Text>
          <View style={styles.userMetaRow}>
            <Text style={styles.userLocation}>📍 {user?.location || 'Unknown'}</Text>
            <Text style={styles.userRating}>⭐ {user?.ratingAverage || 0} · {user?.ratingCount || 0} sessions</Text>
          </View>
        </View>

        {/* Why This Match */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Why This Match?</Text>
          <View style={styles.reasonsCard}>
            {match.reasons.map((reason: string, index: number) => (
              <View key={index} style={styles.reasonItem}>
                <Text style={styles.reasonCheck}>✅</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Skills Match - USING SKILLTAG COMPONENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Skills Match</Text>
          <View style={styles.skillsGrid}>
            {match.matchedSkills.map((skill: string, index: number) => (
              <SkillTag key={index} skill={skill} type="match" />
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation?.navigate('MatchExplanation', { matchId: match.matchId })}
          >
            <Text style={styles.primaryButtonText}>📊 See Full Breakdown</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => {
              navigation?.navigate('CreateExchange', { matchedUserId: match.matchedUserId });
            }}
          >
            <Text style={styles.primaryButtonText}>📨 Request Exchange</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => {
              navigation?.navigate('StudentProfile', { userId: match.matchedUserId });
            }}
          >
            <Text style={styles.secondaryButtonText}>👤 View Full Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#6C63FF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 32,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scoreContainer: {
    backgroundColor: '#6C63FF',
    paddingVertical: 30,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#E8ECF1',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  userLocation: {
    fontSize: 16,
    color: '#666666',
    marginRight: 12,
  },
  userRating: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  reasonsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonCheck: {
    fontSize: 16,
    marginRight: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#1A1A2E',
    flex: 1,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 30,
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  secondaryButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MatchDetailsScreen;