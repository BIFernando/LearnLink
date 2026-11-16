import { useEffect, useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getIdTokenResult } from "firebase/auth";
import { Redirect } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { signOutStudent } from "@/services/authService";

type AdminClaimState = "checking" | "admin" | "student" | "error";

interface AdminClaimCheck {
  uid: string;
  state: AdminClaimState;
}

interface StudentProfileRecoveryStateProps {
  title: string;
  message: string;
  signOutError: string | null;
  isSigningOut: boolean;
  onRetry: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function StudentRouteGuard({ children }: PropsWithChildren) {
  const {
    isLoading,
    user,
    studentProfile,
    isEmailVerified,
    error,
    refreshStudentProfile,
  } = useAuth();
  const [adminClaimCheck, setAdminClaimCheck] =
    useState<AdminClaimCheck | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
export function StudentRouteGuard({ children }: PropsWithChildren) {
  const { isLoading, user, isEmailVerified } = useAuth();
  const [adminClaimCheck, setAdminClaimCheck] =
    useState<AdminClaimCheck | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (isLoading || !user) {
      setAdminClaimCheck(null);
      return;
    }

    let isActive = true;
    setAdminClaimCheck({ uid: user.uid, state: "checking" });

    getIdTokenResult(user, true)
      .then(({ claims }) => {
        if (isActive) {
          setAdminClaimCheck({
            uid: user.uid,
            state: claims.admin === true ? "admin" : "student",
          });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          console.error("Failed to verify the current account role.", error);
          setAdminClaimCheck({ uid: user.uid, state: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [isLoading, retryCount, user]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (
    !adminClaimCheck ||
    adminClaimCheck.uid !== user.uid ||
    adminClaimCheck.state === "checking"
  ) {
    return <LoadingState />;
  }

  if (adminClaimCheck.state === "error") {
    return (
      <View style={styles.stateContainer}>
        <Text accessibilityRole="alert" style={styles.error}>
          Your account access could not be verified. Check your connection and
          try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setRetryCount((count) => count + 1)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  async function handleRetryProfile() {
    setSignOutError(null);
    await refreshStudentProfile();
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOutStudent();
    } catch (signOutFailure) {
      setSignOutError(
        signOutFailure instanceof Error
          ? signOutFailure.message
          : "Could not sign out. Please try again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  if (adminClaimCheck.state === "admin") {
    return <Redirect href="/admin" />;
  }

  if (!isEmailVerified) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  if (error) {
    return (
      <StudentProfileRecoveryState
        title="Student profile unavailable"
        message={`Your student profile could not be loaded. ${error}`}
        signOutError={signOutError}
        isSigningOut={isSigningOut}
        onRetry={handleRetryProfile}
        onSignOut={handleSignOut}
      />
    );
  }

  if (!studentProfile) {
    return (
      <StudentProfileRecoveryState
        title="Student profile not found"
        message="We could not find a student profile for this account. Retry to check again, or sign out and contact support. No replacement profile will be created automatically."
        signOutError={signOutError}
        isSigningOut={isSigningOut}
        onRetry={handleRetryProfile}
        onSignOut={handleSignOut}
      />
    );
  }

  return children;
}

function StudentProfileRecoveryState({
  title,
  message,
  signOutError,
  isSigningOut,
  onRetry,
  onSignOut,
}: StudentProfileRecoveryStateProps) {
  return (
    <View style={styles.stateContainer}>
      <Text style={styles.title}>{title}</Text>
      <Text accessibilityRole="alert" style={styles.error}>
        {message}
      </Text>
      {signOutError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {signOutError}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={() => void onRetry()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={() => void onSignOut()}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </Text>
      </Pressable>
    </View>
  );
}

  return children;
}

function LoadingState() {
  return (
    <View style={styles.stateContainer}>
      <ActivityIndicator color="#3159A5" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  error: {
    color: "#B42318",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: "center",
  },
  title: {
    color: "#17243A",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    minWidth: 120,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    minWidth: 120,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#3159A5",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
