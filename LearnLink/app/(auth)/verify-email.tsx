import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FirebaseError } from "firebase/app";
import { sendEmailVerification } from "firebase/auth";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../../config/firebase";
import { useAuth } from "../../providers/AuthProvider";

type VerificationAction = "resend" | "check";

interface VerificationFeedback {
  kind: "success" | "pending" | "error";
  message: string;
}

function getVerificationErrorMessage(
  error: unknown,
  action: VerificationAction,
): string {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Please wait a while before trying again.";
    }

    if (error.code === "auth/network-request-failed") {
      return "A network error occurred. Check your connection and try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return action === "resend"
    ? "The verification email could not be sent. Please try again."
    : "Your verification status could not be checked. Please try again.";
}

export default function VerifyEmailScreen() {
  const { email: emailParam } = useLocalSearchParams<{
    email?: string | string[];
  }>();
  const { user, isEmailVerified, refreshEmailVerification } = useAuth();
  const [activeAction, setActiveAction] =
    useState<VerificationAction | null>(null);
  const [feedback, setFeedback] = useState<VerificationFeedback | null>(null);
  const actionInProgress = useRef(false);
  const currentUser = auth.currentUser ?? user;
  const paramEmail = Array.isArray(emailParam) ? emailParam[0] : emailParam;
  const registeredEmail = currentUser?.email ?? paramEmail ?? "";

  async function handleResendVerification() {
    if (actionInProgress.current) {
      return;
    }

    const firebaseUser = auth.currentUser ?? user;
    if (!firebaseUser) {
      setFeedback({
        kind: "error",
        message:
          "No signed-in registration session was found. Please register again.",
      });
      return;
    }

    if (firebaseUser.emailVerified || isEmailVerified) {
      setFeedback({
        kind: "success",
        message: "This email address is already verified.",
      });
      return;
    }

    actionInProgress.current = true;
    setActiveAction("resend");
    setFeedback(null);

    try {
      await sendEmailVerification(firebaseUser);
      setFeedback({
        kind: "success",
        message: `A new verification email was sent to ${registeredEmail}.`,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: getVerificationErrorMessage(error, "resend"),
      });
    } finally {
      actionInProgress.current = false;
      setActiveAction(null);
    }
  }

  async function handleCheckVerification() {
    if (actionInProgress.current) {
      return;
    }

    if (!auth.currentUser && !user) {
      setFeedback({
        kind: "error",
        message:
          "No signed-in registration session was found. Please register again.",
      });
      return;
    }

    actionInProgress.current = true;
    setActiveAction("check");
    setFeedback(null);

    try {
      const emailVerified = await refreshEmailVerification();
      setFeedback(
        emailVerified
          ? {
              kind: "success",
              message: "Your email address has been verified successfully.",
            }
          : {
              kind: "pending",
              message:
                "Email verification is still pending. Open the link in your inbox, then check again.",
            },
      );
    } catch (error) {
      setFeedback({
        kind: "error",
        message: getVerificationErrorMessage(error, "check"),
      });
    } finally {
      actionInProgress.current = false;
      setActiveAction(null);
    }
  }

  const isBusy = activeAction !== null;
  const hasSession = Boolean(auth.currentUser ?? user);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>LEARNLINK</Text>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We sent a verification link to:
            </Text>
            <Text style={styles.email}>{registeredEmail || "Unavailable"}</Text>
            <Text style={styles.instructions}>
              Open the link in that email to verify your account. You may need
              to check your spam or junk folder.
            </Text>

            {!hasSession ? (
              <Text accessibilityRole="alert" style={styles.errorMessage}>
                No signed-in registration session was found. Please register
                again to resend or check verification.
              </Text>
            ) : null}

            {feedback ? (
              <Text
                accessibilityRole="alert"
                style={[
                  styles.feedback,
                  feedback.kind === "success"
                    ? styles.successFeedback
                    : undefined,
                  feedback.kind === "pending"
                    ? styles.pendingFeedback
                    : undefined,
                  feedback.kind === "error" ? styles.errorFeedback : undefined,
                ]}
              >
                {feedback.message}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isBusy || !hasSession}
              onPress={handleResendVerification}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isBusy || !hasSession) && styles.buttonMuted,
              ]}
            >
              {activeAction === "resend" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Resend Verification Email
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isBusy || !hasSession}
              onPress={handleCheckVerification}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || isBusy || !hasSession) && styles.buttonMuted,
              ]}
            >
              {activeAction === "check" ? (
                <ActivityIndicator color="#3159A5" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  I&apos;ve Verified My Email
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F3F6FB",
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 480,
    padding: 24,
    width: "100%",
  },
  eyebrow: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: {
    color: "#17243A",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  email: {
    color: "#17243A",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 4,
  },
  instructions: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
    marginTop: 12,
  },
  feedback: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    padding: 12,
  },
  successFeedback: {
    backgroundColor: "#ECFDF3",
    borderColor: "#A6F4C5",
    color: "#027A48",
  },
  pendingFeedback: {
    backgroundColor: "#FFFAEB",
    borderColor: "#FEDF89",
    color: "#B54708",
  },
  errorFeedback: {
    backgroundColor: "#FEF3F2",
    borderColor: "#FECDCA",
    color: "#B42318",
  },
  errorMessage: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#3159A5",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: "#3159A5",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonMuted: {
    opacity: 0.65,
  },
});
