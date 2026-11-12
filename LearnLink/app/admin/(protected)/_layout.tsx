import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Redirect, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../../../config/firebase";
import { verifyAdminAccess } from "../../../services/adminAuth";

type AccessState = "checking" | "allowed" | "signed-out" | "error";

export default function ProtectedAdminLayout() {
  const [access, setAccess] = useState<AccessState>("checking");
  const checkId = useRef(0);

  const verifyUser = useCallback(async (user: User, id: number) => {
    setAccess("checking");

    try {
      const isAdmin = await verifyAdminAccess(user);
      if (checkId.current === id) {
        setAccess(isAdmin ? "allowed" : "signed-out");
      }
    } catch {
      if (checkId.current === id) {
        setAccess("error");
      }
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const id = ++checkId.current;

      if (!user) {
        setAccess("signed-out");
        return;
      }

      void verifyUser(user, id);
    });
  }, [verifyUser]);

  const retryVerification = useCallback(() => {
    const id = ++checkId.current;
    const user = auth.currentUser;

    if (!user) {
      setAccess("signed-out");
      return;
    }

    void verifyUser(user, id);
  }, [verifyUser]);

  if (access === "signed-out") {
    return <Redirect href="/admin/login" />;
  }

  if (access === "checking") {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#3159A5" size="large" />
        <Text style={styles.message}>Verifying administrator access...</Text>
      </SafeAreaView>
    );
  }

  if (access === "error") {
    return (
      <SafeAreaView style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.error}>
          Administrator access could not be verified. Check your connection
          and try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={retryVerification}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  message: {
    color: "#334155",
    fontSize: 15,
    marginTop: 14,
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
