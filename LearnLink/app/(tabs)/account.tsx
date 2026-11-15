import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/AuthProvider';
import {
  disableStudentPublicProfileVisibility,
  enableStudentPublicProfileVisibility,
  getStudentPublicProfileVisibility,
} from '@/services/publicProfileVisibilityService';

export default function AccountScreen() {
  const router = useRouter();
  const {
    user,
    studentProfile,
    isLoading: isAuthLoading,
    isEmailVerified,
  } = useAuth();
  const visibilityRequestInProgress = useRef(false);
  const visibilityLoadId = useRef(0);
  const [isDiscoverable, setIsDiscoverable] = useState<boolean | null>(null);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isVisibilityUpdating, setIsVisibilityUpdating] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null);
  const canManageVisibility = Boolean(user && isEmailVerified);
  const displayName =
    typeof studentProfile?.displayName === 'string'
      ? studentProfile.displayName
      : '';
  const bio =
    typeof studentProfile?.bio === 'string' ? studentProfile.bio.trim() : '';
  const profilePhotoUrl =
    typeof studentProfile?.profilePhotoUrl === 'string'
      ? studentProfile.profilePhotoUrl
      : '';
  const educationDetails = [
    {
      label: 'University',
      value:
        typeof studentProfile?.university === 'string'
          ? studentProfile.university.trim()
          : '',
    },
    {
      label: 'Faculty',
      value:
        typeof studentProfile?.faculty === 'string'
          ? studentProfile.faculty.trim()
          : '',
    },
    {
      label: 'Degree',
      value:
        typeof studentProfile?.degree === 'string'
          ? studentProfile.degree.trim()
          : '',
    },
    {
      label: 'Course',
      value:
        typeof studentProfile?.course === 'string'
          ? studentProfile.course.trim()
          : '',
    },
    {
      label: 'Academic year',
      value:
        typeof studentProfile?.academicYear === 'string'
          ? studentProfile.academicYear.trim()
          : '',
    },
  ].filter((detail) => detail.value.length > 0);

  const loadVisibility = useCallback(async () => {
    const requestId = ++visibilityLoadId.current;

    if (!user || !isEmailVerified) {
      setIsDiscoverable(null);
      setVisibilityError(null);
      setIsVisibilityLoading(false);
      return;
    }

    setIsVisibilityLoading(true);
    setVisibilityError(null);

    try {
      const result = await getStudentPublicProfileVisibility();
      if (requestId === visibilityLoadId.current) {
        setIsDiscoverable(result.isDiscoverable);
      }
    } catch (loadError) {
      console.error('Failed to load public profile visibility:', loadError);
      if (requestId === visibilityLoadId.current) {
        setIsDiscoverable(null);
        setVisibilityError('Could not load visibility. Please try again.');
      }
    } finally {
      if (requestId === visibilityLoadId.current) {
        setIsVisibilityLoading(false);
      }
    }
  }, [isEmailVerified, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void loadVisibility();
    return () => {
      visibilityLoadId.current += 1;
    };
  }, [isAuthLoading, loadVisibility]);

  async function handleVisibilityChange(nextValue: boolean) {
    if (
      visibilityRequestInProgress.current ||
      isDiscoverable === null ||
      !canManageVisibility
    ) {
      return;
    }

    visibilityRequestInProgress.current = true;
    setIsVisibilityUpdating(true);
    setVisibilityError(null);
    setVisibilityMessage(null);

    try {
      const result = nextValue
        ? await enableStudentPublicProfileVisibility()
        : await disableStudentPublicProfileVisibility();
      setIsDiscoverable(result.isDiscoverable);
      setVisibilityMessage(
        result.isDiscoverable
          ? 'Public profile visibility is ON.'
          : 'Public profile visibility is OFF.',
      );
    } catch (visibilityUpdateError) {
      console.error(
        'Failed to update public profile visibility:',
        visibilityUpdateError,
      );
      setVisibilityError(
        'Could not update visibility. Please try again.',
      );
    } finally {
      visibilityRequestInProgress.current = false;
      setIsVisibilityUpdating(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Account
        </ThemedText>
        <ThemedText style={styles.description}>
          Manage your student account.
        </ThemedText>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <ThemedText type="subtitle">Student profile</ThemedText>
            <Pressable
              accessibilityRole="button"
              disabled={isAuthLoading || !studentProfile}
              onPress={() => router.push('/(tabs)/edit-profile')}
              style={styles.editProfileButton}
            >
              <ThemedText style={styles.retryText}>Edit Profile</ThemedText>
            </Pressable>
          </View>
          {isAuthLoading ? (
            <ActivityIndicator color="#3159A5" />
          ) : (
            <View>
              <View style={styles.profileContent}>
                {profilePhotoUrl ? (
                  <Image
                    accessibilityLabel="Student profile picture"
                    contentFit="cover"
                    source={{ uri: profilePhotoUrl }}
                    style={styles.profilePhoto}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <ThemedText style={styles.photoPlaceholderText}>
                      No photo
                    </ThemedText>
                  </View>
                )}
                <View style={styles.profileDetails}>
                  <ThemedText type="defaultSemiBold">
                    {displayName.trim() || 'Name unavailable'}
                  </ThemedText>
                  <ThemedText>{bio || 'No bio added yet.'}</ThemedText>
                </View>
              </View>
              <View style={styles.educationDetails}>
                <ThemedText type="defaultSemiBold">Education</ThemedText>
                {educationDetails.length > 0 ? (
                  educationDetails.map((detail) => (
                    <View key={detail.label} style={styles.educationRow}>
                      <ThemedText style={styles.educationLabel}>
                        {detail.label}
                      </ThemedText>
                      <ThemedText style={styles.educationValue}>
                        {detail.value}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText>No education details added yet.</ThemedText>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.visibilityCard}>
          <ThemedText type="subtitle" style={styles.visibilityTitle}>
            Public profile
          </ThemedText>
          <View style={styles.visibilityRow}>
            <View style={styles.visibilityCopy}>
              <ThemedText type="defaultSemiBold">
                Visibility: {isDiscoverable === null ? 'Unavailable' : isDiscoverable ? 'ON' : 'OFF'}
              </ThemedText>
              <ThemedText style={styles.visibilityDescription}>
                When on, your public profile is marked discoverable. Public
                profile reads are currently blocked by Firestore Rules.
              </ThemedText>
            </View>
            {isVisibilityLoading || isVisibilityUpdating ? (
              <ActivityIndicator color="#3159A5" />
            ) : (
              <Switch
                accessibilityLabel="Public profile visibility"
                disabled={
                  !canManageVisibility ||
                  isDiscoverable === null ||
                  isVisibilityUpdating
                }
                onValueChange={(value) => {
                  void handleVisibilityChange(value);
                }}
                trackColor={{ false: '#94A3B8', true: '#3159A5' }}
                value={isDiscoverable ?? false}
              />
            )}
          </View>
          {isVisibilityLoading ? (
            <ThemedText style={styles.visibilityHint}>
              Loading visibility status...
            </ThemedText>
          ) : null}
          {!canManageVisibility && !isAuthLoading ? (
            <ThemedText style={styles.visibilityHint}>
              Sign in with a verified email to manage profile visibility.
            </ThemedText>
          ) : null}
          {visibilityError ? (
            <ThemedText accessibilityRole="alert" style={styles.error}>
              {visibilityError}
            </ThemedText>
          ) : null}
          {visibilityError && canManageVisibility && isDiscoverable === null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void loadVisibility();
              }}
              style={styles.retryButton}
            >
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </Pressable>
          ) : null}
          {visibilityMessage ? (
            <ThemedText accessibilityRole="alert" style={styles.success}>
              {visibilityMessage}
            </ThemedText>
          ) : null}
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 20,
  },
  profileCard: {
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileDetails: {
    gap: 8,
    flex: 1,
  },
  profileContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  educationDetails: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
  },
  educationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  educationLabel: {
    color: '#475569',
    fontWeight: '600',
    width: 112,
  },
  educationValue: {
    flex: 1,
  },
  profilePhoto: {
    backgroundColor: '#E2E8F0',
    borderRadius: 32,
    height: 64,
    width: 64,
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  photoPlaceholderText: {
    color: '#475569',
    fontSize: 11,
  },
  editProfileButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  visibilityCard: {
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  visibilityTitle: {
    marginBottom: 12,
  },
  visibilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  visibilityCopy: {
    flex: 1,
  },
  visibilityDescription: {
    marginTop: 4,
  },
  visibilityHint: {
    color: '#475569',
    marginTop: 10,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: '#3159A5',
    fontWeight: '700',
  },
  success: {
    color: '#15803D',
    marginTop: 10,
  },
  error: {
    color: '#B42318',
    marginTop: 16,
    textAlign: 'center',
  },
});
