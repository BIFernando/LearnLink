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

type AdminClaimState = "checking" | "admin" | "student" | "error";

interface AdminClaimCheck {
  uid: string;
  state: AdminClaimState;
}

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

  if (adminClaimCheck.state === "admin") {
    return <Redirect href="/admin" />;
  }

  if (!isEmailVerified) {
    return <Redirect href="/(auth)/verify-email" />;
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
  button: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    minWidth: 120,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
