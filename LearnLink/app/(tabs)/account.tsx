import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { signOutStudent } from '@/services/authService';

export default function AccountScreen() {
  const router = useRouter();
  const logoutInProgress = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (logoutInProgress.current) {
      return;
    }

    logoutInProgress.current = true;
    setIsSigningOut(true);
    setError(null);

    try {
      await signOutStudent();
      router.replace('/(auth)/login');
    } catch (logoutError) {
      console.error('Failed to sign out student:', logoutError);
      setError('Could not sign out. Please try again.');
      logoutInProgress.current = false;
      setIsSigningOut(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Account
        </ThemedText>
        <ThemedText style={styles.description}>
          Manage your student account.
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            (pressed || isSigningOut) && styles.buttonMuted,
          ]}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          )}
        </Pressable>

        {error ? (
          <ThemedText accessibilityRole="alert" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 28,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#B42318',
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonMuted: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#B42318',
    marginTop: 16,
    textAlign: 'center',
  },
});
