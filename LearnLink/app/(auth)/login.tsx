import { useRef, useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FirebaseError } from "firebase/app";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { studentLoginSchema } from "../../schemas/auth";
import {
  sendStudentPasswordResetEmail,
  signInStudent,
} from "../../services/authService";

type LoginField = "email" | "password";
type LoginAction = "login" | "reset";

type LoginFieldErrors = Partial<Record<LoginField, string>>;

interface LoginFeedback {
  kind: "success" | "error";
  message: string;
}

interface FieldProps extends PropsWithChildren {
  label: string;
  error?: string;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "The email or password is incorrect.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support for help.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a while and try again.";
      case "auth/network-request-failed":
        return "A network error occurred. Check your connection and try again.";
      default:
        return "Could not sign in. Please try again.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Could not sign in. Please try again.";
}

function getPasswordResetErrorMessage(error: unknown): string {
  if (
    error instanceof FirebaseError &&
    error.code === "auth/user-not-found"
  ) {
    return "If an account exists for this email, a password reset email has been sent.";
  }

  if (error instanceof FirebaseError) {
    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Please wait a while and try again.";
    }

    if (error.code === "auth/network-request-failed") {
      return "A network error occurred. Check your connection and try again.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Could not send a password reset email. Please try again.";
}

export default function StudentLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [feedback, setFeedback] = useState<LoginFeedback | null>(null);
  const [activeAction, setActiveAction] = useState<LoginAction | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const actionInProgress = useRef(false);
  const passwordInput = useRef<TextInput>(null);

  function updateEmail(value: string) {
    setEmail(value);
    setFieldErrors((current) => ({ ...current, email: undefined }));
    setFeedback(null);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
    setFeedback(null);
  }

  async function handleLogin() {
    if (actionInProgress.current) {
      return;
    }

    const validation = studentLoginSchema.safeParse({ email, password });
    if (!validation.success) {
      const nextErrors: LoginFieldErrors = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (
          (field === "email" || field === "password") &&
          !nextErrors[field]
        ) {
          nextErrors[field] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      setFeedback(null);
      return;
    }

    actionInProgress.current = true;
    setActiveAction("login");
    setFieldErrors({});
    setFeedback(null);

    try {
      const user = await signInStudent(validation.data);
      if (!user.emailVerified) {
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: user.email ?? validation.data.email },
        });
        return;
      }

      router.replace("/");
    } catch (error) {
      setFeedback({
        kind: "error",
        message: getLoginErrorMessage(error),
      });
    } finally {
      actionInProgress.current = false;
      setActiveAction(null);
    }
  }

  async function handlePasswordReset() {
    if (actionInProgress.current) {
      return;
    }

    const emailValidation = studentLoginSchema.shape.email.safeParse(email);
    if (!emailValidation.success) {
      setFieldErrors((current) => ({
        ...current,
        email: emailValidation.error.issues[0]?.message ?? "Enter a valid email address.",
      }));
      setFeedback(null);
      return;
    }

    actionInProgress.current = true;
    setActiveAction("reset");
    setFieldErrors((current) => ({ ...current, email: undefined }));
    setFeedback(null);

    try {
      await sendStudentPasswordResetEmail(emailValidation.data);
      setFeedback({
        kind: "success",
        message:
          "If an account exists for this email, a password reset email has been sent.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: getPasswordResetErrorMessage(error),
      });
    } finally {
      actionInProgress.current = false;
      setActiveAction(null);
    }
  }

  const isBusy = activeAction !== null;

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
            <Text style={styles.title}>Student sign in</Text>
            <Text style={styles.subtitle}>
              Sign in with your university email address.
            </Text>

            <Field label="University Email" error={fieldErrors.email}>
              <TextInput
                accessibilityLabel="University Email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isBusy}
                keyboardType="email-address"
                onChangeText={updateEmail}
                onSubmitEditing={() => passwordInput.current?.focus()}
                placeholder="student@university.ac.lk"
                placeholderTextColor="#8793A5"
                returnKeyType="next"
                style={[
                  styles.input,
                  fieldErrors.email ? styles.inputInvalid : undefined,
                ]}
                textContentType="emailAddress"
                value={email}
              />
            </Field>

            <Field label="Password" error={fieldErrors.password}>
              <View
                style={[
                  styles.passwordControl,
                  fieldErrors.password ? styles.inputInvalid : undefined,
                ]}
              >
                <TextInput
                  ref={passwordInput}
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  editable={!isBusy}
                  onChangeText={updatePassword}
                  onSubmitEditing={handleLogin}
                  placeholder="Enter your password"
                  placeholderTextColor="#8793A5"
                  returnKeyType="done"
                  secureTextEntry={!isPasswordVisible}
                  style={styles.passwordInput}
                  textContentType="password"
                  value={password}
                />
                <Pressable
                  accessibilityLabel={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => setIsPasswordVisible((visible) => !visible)}
                  style={styles.visibilityButton}
                >
                  <Text style={styles.visibilityText}>
                    {isPasswordVisible ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
            </Field>

            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={handlePasswordReset}
              style={styles.forgotButton}
            >
              {activeAction === "reset" ? (
                <ActivityIndicator color="#3159A5" size="small" />
              ) : (
                <Text style={styles.forgotText}>Forgot password?</Text>
              )}
            </Pressable>

            {feedback ? (
              <Text
                accessibilityRole="alert"
                style={[
                  styles.feedback,
                  feedback.kind === "success"
                    ? styles.successFeedback
                    : styles.errorFeedback,
                ]}
              >
                {feedback.message}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.button,
                (pressed || isBusy) && styles.buttonMuted,
              ]}
            >
              {activeAction === "login" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="link"
              disabled={isBusy}
              onPress={() => router.push("/(auth)/register")}
              style={styles.registerLink}
            >
              <Text style={styles.registerLinkText}>
                Don&apos;t have an account? Register
              </Text>
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
    maxWidth: 440,
    padding: 28,
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
    marginBottom: 26,
    marginTop: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  fieldError: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    color: "#17243A",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  passwordControl: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
  },
  passwordInput: {
    color: "#17243A",
    flex: 1,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  inputInvalid: {
    borderColor: "#B42318",
  },
  visibilityButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  visibilityText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
  },
  forgotButton: {
    alignSelf: "flex-end",
    justifyContent: "center",
    marginBottom: 16,
    minHeight: 32,
    paddingHorizontal: 4,
  },
  forgotText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
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
  errorFeedback: {
    backgroundColor: "#FEF3F2",
    borderColor: "#FECDCA",
    color: "#B42318",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 50,
    marginTop: 4,
  },
  buttonMuted: {
    opacity: 0.72,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  registerLink: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    minHeight: 36,
  },
  registerLinkText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
  },
});
