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
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { studentRegistrationSchema } from "../../schemas/auth";
import {
  registerStudent,
  StudentRegistrationError,
} from "../../services/authService";

type RegistrationField =
  | "fullName"
  | "email"
  | "password"
  | "confirmPassword";

type RegistrationFieldErrors = Partial<Record<RegistrationField, string>>;

interface RegistrationForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldProps extends PropsWithChildren {
  label: string;
  helper?: string;
  error?: string;
}

function Field({ label, helper, error, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function StudentRegistrationScreen() {
  const router = useRouter();
  const [form, setForm] = useState<RegistrationForm>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const submissionInProgress = useRef(false);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmationInput = useRef<TextInput>(null);

  function updateField(field: RegistrationField, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setFormError("");
  }

  async function handleRegister() {
    if (submissionInProgress.current || isRegistrationComplete) {
      return;
    }

    const validation = studentRegistrationSchema.safeParse({
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    if (!validation.success) {
      const nextErrors: RegistrationFieldErrors = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (
          (field === "fullName" ||
            field === "email" ||
            field === "password" ||
            field === "confirmPassword") &&
          !nextErrors[field]
        ) {
          nextErrors[field] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      setFormError("");
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");

    try {
      const result = await registerStudent(validation.data);
      setIsRegistrationComplete(true);
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: result.email },
      });
    } catch (error) {
      if (error instanceof StudentRegistrationError) {
        setFormError(
          error.userId
            ? `${error.message} User ID: ${error.userId}.`
            : error.message,
        );
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "Registration could not be completed. Please try again.",
        );
      }
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  const isFormDisabled = isSubmitting || isRegistrationComplete;

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
            <Text style={styles.title}>Create your student account</Text>
            <Text style={styles.subtitle}>
              Register with an academic email address ending in .ac.lk.
            </Text>

            <Field label="Full Name" error={fieldErrors.fullName}>
              <TextInput
                accessibilityLabel="Full Name"
                autoCapitalize="words"
                autoComplete="name"
                autoCorrect={false}
                editable={!isFormDisabled}
                onChangeText={(value) => updateField("fullName", value)}
                onSubmitEditing={() => emailInput.current?.focus()}
                placeholder="Enter your full name"
                placeholderTextColor="#8793A5"
                returnKeyType="next"
                style={styles.input}
                textContentType="name"
                value={form.fullName}
              />
            </Field>

            <Field label="University Email" error={fieldErrors.email}>
              <TextInput
                ref={emailInput}
                accessibilityLabel="University Email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isFormDisabled}
                keyboardType="email-address"
                onChangeText={(value) => updateField("email", value)}
                onSubmitEditing={() => passwordInput.current?.focus()}
                placeholder="student@university.ac.lk"
                placeholderTextColor="#8793A5"
                returnKeyType="next"
                style={[
                  styles.input,
                  fieldErrors.email ? styles.inputInvalid : undefined,
                ]}
                textContentType="emailAddress"
                value={form.email}
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
                  autoComplete="new-password"
                  editable={!isFormDisabled}
                  onChangeText={(value) => updateField("password", value)}
                  onSubmitEditing={() => confirmationInput.current?.focus()}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#8793A5"
                  returnKeyType="next"
                  secureTextEntry={!isPasswordVisible}
                  style={styles.passwordInput}
                  textContentType="newPassword"
                  value={form.password}
                />
                <Pressable
                  accessibilityLabel={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  accessibilityRole="button"
                  disabled={isFormDisabled}
                  onPress={() => setIsPasswordVisible((visible) => !visible)}
                  style={styles.visibilityButton}
                >
                  <Text style={styles.visibilityText}>
                    {isPasswordVisible ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
            </Field>

            <Field
              label="Confirm Password"
              error={fieldErrors.confirmPassword}
            >
              <View
                style={[
                  styles.passwordControl,
                  fieldErrors.confirmPassword
                    ? styles.inputInvalid
                    : undefined,
                ]}
              >
                <TextInput
                  ref={confirmationInput}
                  accessibilityLabel="Confirm Password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isFormDisabled}
                  onChangeText={(value) =>
                    updateField("confirmPassword", value)
                  }
                  onSubmitEditing={handleRegister}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#8793A5"
                  returnKeyType="done"
                  secureTextEntry={!isConfirmationVisible}
                  style={styles.passwordInput}
                  textContentType="newPassword"
                  value={form.confirmPassword}
                />
                <Pressable
                  accessibilityLabel={
                    isConfirmationVisible
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  accessibilityRole="button"
                  disabled={isFormDisabled}
                  onPress={() =>
                    setIsConfirmationVisible((visible) => !visible)
                  }
                  style={styles.visibilityButton}
                >
                  <Text style={styles.visibilityText}>
                    {isConfirmationVisible ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
            </Field>

            {formError ? (
              <Text accessibilityRole="alert" style={styles.formError}>
                {formError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isFormDisabled}
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.button,
                (pressed || isFormDisabled) && styles.buttonMuted,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isRegistrationComplete
                    ? "Registration complete"
                    : "Register"}
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
    marginBottom: 24,
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
  helper: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  fieldError: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  formError: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 50,
  },
  buttonMuted: {
    opacity: 0.72,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
