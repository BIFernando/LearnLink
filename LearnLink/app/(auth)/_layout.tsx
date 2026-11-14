import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

export default function AuthLayout() {
  const { isLoading, user, isEmailVerified } = useAuth();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#3159A5" size="large" />
      </View>
    );
  }

  if (user && isEmailVerified) {
    return <Redirect href="/(tabs)" />;
  }

  if (user && currentRoute !== "verify-email") {
    return <Redirect href="/(auth)/verify-email" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    flex: 1,
    justifyContent: "center",
  },
});
