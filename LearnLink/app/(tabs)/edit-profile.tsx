import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/providers/AuthProvider";
import {
  studentProfileUpdateSchema,
  type StudentProfileUpdate,
} from "@/schemas/studentProfile";
import type { StudentProfilePhotoAsset } from "@/services/studentProfileService";

type ProfileFieldErrors = Partial<Record<keyof StudentProfileUpdate, string>>;

const EDUCATION_FIELDS = [
  {
    name: "university",
    label: "University",
    placeholder: "Enter your university",
    maxLength: 150,
  },
  {
    name: "faculty",
    label: "Faculty",
    placeholder: "Enter your faculty",
    maxLength: 150,
  },
  {
    name: "degree",
    label: "Degree",
    placeholder: "Enter your degree",
    maxLength: 150,
  },
  {
    name: "course",
    label: "Course",
    placeholder: "Enter your course",
    maxLength: 150,
  },
  {
    name: "academicYear",
    label: "Academic year",
    placeholder: "e.g. Year 2 or 2025/26",
    maxLength: 40,
  },
] as const;

function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default function EditProfileScreen() {
  const router = useRouter();
  const {
    user,
    studentProfile,
    isLoading: isAuthLoading,
    saveStudentProfile,
    uploadStudentProfilePhoto,
  } = useAuth();
  const saveInProgress = useRef(false);
  const photoPickInProgress = useRef(false);
  const photoUploadInProgress = useRef(false);
  const [displayName, setDisplayName] = useState(
    textOrEmpty(studentProfile?.displayName),
  );
  const [bio, setBio] = useState(textOrEmpty(studentProfile?.bio));
  const [university, setUniversity] = useState(
    textOrEmpty(studentProfile?.university),
  );
  const [faculty, setFaculty] = useState(textOrEmpty(studentProfile?.faculty));
  const [degree, setDegree] = useState(textOrEmpty(studentProfile?.degree));
  const [course, setCourse] = useState(textOrEmpty(studentProfile?.course));
  const [academicYear, setAcademicYear] = useState(
    textOrEmpty(studentProfile?.academicYear),
  );
  const [selectedPhoto, setSelectedPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoSuccessMessage, setPhotoSuccessMessage] = useState<string | null>(
    null,
  );
  const [photoErrorMessage, setPhotoErrorMessage] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isBusy = isSaving || isPickingPhoto || isUploadingPhoto;
  const currentPhotoUrl =
    typeof studentProfile?.profilePhotoUrl === "string"
      ? studentProfile.profilePhotoUrl
      : "";
  const photoPreviewUri = selectedPhoto?.uri ?? currentPhotoUrl;

  useEffect(() => {
    if (studentProfile) {
      setDisplayName(textOrEmpty(studentProfile.displayName));
      setBio(textOrEmpty(studentProfile.bio));
      setUniversity(textOrEmpty(studentProfile.university));
      setFaculty(textOrEmpty(studentProfile.faculty));
      setDegree(textOrEmpty(studentProfile.degree));
      setCourse(textOrEmpty(studentProfile.course));
      setAcademicYear(textOrEmpty(studentProfile.academicYear));
    }
  }, [studentProfile]);

  function updateField(field: keyof StudentProfileUpdate, value: string) {
    switch (field) {
      case "displayName":
        setDisplayName(value);
        break;
      case "bio":
        setBio(value);
        break;
      case "university":
        setUniversity(value);
        break;
      case "faculty":
        setFaculty(value);
        break;
      case "degree":
        setDegree(value);
        break;
      case "course":
        setCourse(value);
        break;
      case "academicYear":
        setAcademicYear(value);
        break;
    }

    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleSave() {
    if (saveInProgress.current || isBusy || !user || !studentProfile) {
      return;
    }

    const validation = studentProfileUpdateSchema.safeParse({
      displayName,
      bio,
      university,
      faculty,
      degree,
      course,
      academicYear,
    });

    if (!validation.success) {
      const nextErrors: ProfileFieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (
          (field === "displayName" || field === "bio") &&
          !nextErrors[field]
        ) {
          nextErrors[field] = issue.message;
        } else if (
          (field === "university" ||
            field === "faculty" ||
            field === "degree" ||
            field === "course" ||
            field === "academicYear") &&
          !nextErrors[field]
        ) {
          nextErrors[field] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      setSuccessMessage(null);
      setErrorMessage(null);
      return;
    }

    saveInProgress.current = true;
    setIsSaving(true);
    setFieldErrors({});
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await saveStudentProfile(validation.data);
      setDisplayName(validation.data.displayName);
      setBio(validation.data.bio);
      setUniversity(validation.data.university ?? "");
      setFaculty(validation.data.faculty ?? "");
      setDegree(validation.data.degree ?? "");
      setCourse(validation.data.course ?? "");
      setAcademicYear(validation.data.academicYear ?? "");
      setSuccessMessage("Your profile has been saved.");
    } catch (saveError) {
      console.error("Failed to save the student profile:", saveError);
      setErrorMessage("Could not save your profile. Please try again.");
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  }

  async function handlePickPhoto() {
    if (
      photoPickInProgress.current ||
      photoUploadInProgress.current ||
      saveInProgress.current
    ) {
      return;
    }

    photoPickInProgress.current = true;
    setIsPickingPhoto(true);
    setPhotoErrorMessage(null);
    setPhotoSuccessMessage(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoErrorMessage(
          "Allow photo library access to choose a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        setPhotoErrorMessage("No image was selected. Please try again.");
        return;
      }

      setSelectedPhoto(asset);
    } catch (pickError) {
      console.error("Failed to select a profile picture:", pickError);
      setPhotoErrorMessage("Could not select a profile picture. Please try again.");
    } finally {
      photoPickInProgress.current = false;
      setIsPickingPhoto(false);
    }
  }

  async function handleUploadPhoto() {
    if (
      photoUploadInProgress.current ||
      saveInProgress.current ||
      !selectedPhoto ||
      !user ||
      !studentProfile
    ) {
      return;
    }

    photoUploadInProgress.current = true;
    setIsUploadingPhoto(true);
    setPhotoUploadProgress(0);
    setPhotoErrorMessage(null);
    setPhotoSuccessMessage(null);

    const asset: StudentProfilePhotoAsset = {
      uri: selectedPhoto.uri,
      fileName: selectedPhoto.fileName,
      fileSize: selectedPhoto.fileSize,
      mimeType: selectedPhoto.mimeType,
    };

    try {
      const result = await uploadStudentProfilePhoto(asset, (progress) => {
        setPhotoUploadProgress(progress);
      });
      setSelectedPhoto(null);
      setPhotoUploadProgress(100);
      setPhotoSuccessMessage(
        result.previousPhotoCleanupFailed
          ? "Profile picture updated, but the previous picture could not be removed."
          : "Your profile picture has been updated.",
      );
    } catch (uploadError) {
      console.error("Failed to upload the profile picture:", uploadError);
      setPhotoErrorMessage(
        uploadError instanceof Error &&
          uploadError.message.startsWith("Profile pictures")
          ? uploadError.message
          : uploadError instanceof Error &&
              uploadError.message.startsWith("Choose a")
            ? uploadError.message
            : "Could not update your profile picture. Please try again.",
      );
    } finally {
      photoUploadInProgress.current = false;
      setIsUploadingPhoto(false);
    }
  }

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.stateContainer}>
        <ActivityIndicator color="#3159A5" size="large" />
        <ThemedText style={styles.stateText}>Loading your profile...</ThemedText>
      </ThemedView>
    );
  }

  if (!user || !studentProfile) {
    return (
      <ThemedView style={styles.stateContainer}>
        <ThemedText accessibilityRole="alert" style={styles.error}>
          Your student profile could not be loaded.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/account")}
          style={styles.secondaryButton}
        >
          <ThemedText style={styles.secondaryButtonText}>
            Back to Account
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => router.replace("/(tabs)/account")}
          style={styles.backButton}
        >
          <ThemedText style={styles.secondaryButtonText}>
            Back to Account
          </ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          Edit Profile
        </ThemedText>
        <ThemedText style={styles.description}>
          Update your profile picture, display name, and bio.
        </ThemedText>

        <View style={styles.photoSection}>
          {photoPreviewUri ? (
            <Image
              accessibilityLabel="Profile picture preview"
              contentFit="cover"
              source={{ uri: photoPreviewUri }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <ThemedText style={styles.photoPlaceholderText}>
                No photo
              </ThemedText>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: isBusy,
            }}
            disabled={isBusy}
            onPress={() => void handlePickPhoto()}
            style={[styles.secondaryButton, isBusy && styles.buttonMuted]}
          >
            {isPickingPhoto ? (
              <ActivityIndicator color="#3159A5" />
            ) : (
              <ThemedText style={styles.secondaryButtonText}>
                Choose Profile Picture
              </ThemedText>
            )}
          </Pressable>
          {selectedPhoto ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: isBusy,
              }}
              disabled={isBusy}
              onPress={() => void handleUploadPhoto()}
              style={[
                styles.photoUploadButton,
                isBusy && styles.buttonMuted,
              ]}
            >
              {isUploadingPhoto ? (
                <View style={styles.uploadProgress}>
                  <ActivityIndicator color="#FFFFFF" />
                  <ThemedText style={styles.saveButtonText}>
                    Uploading {photoUploadProgress}%
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.saveButtonText}>
                  Upload Photo
                </ThemedText>
              )}
            </Pressable>
          ) : null}
          {photoSuccessMessage ? (
            <ThemedText accessibilityRole="alert" style={styles.success}>
              {photoSuccessMessage}
            </ThemedText>
          ) : null}
          {photoErrorMessage ? (
            <ThemedText accessibilityRole="alert" style={styles.error}>
              {photoErrorMessage}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Display name</ThemedText>
          <TextInput
            accessibilityLabel="Display name"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isBusy}
            maxLength={100}
            onChangeText={(value) => updateField("displayName", value)}
            placeholder="Enter your display name"
            placeholderTextColor="#8793A5"
            style={[
              styles.input,
              fieldErrors.displayName ? styles.inputInvalid : undefined,
            ]}
            value={displayName}
          />
          {fieldErrors.displayName ? (
            <ThemedText accessibilityRole="alert" style={styles.error}>
              {fieldErrors.displayName}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Bio</ThemedText>
          <TextInput
            accessibilityLabel="Bio"
            autoCapitalize="sentences"
            editable={!isBusy}
            maxLength={1000}
            multiline
            onChangeText={(value) => updateField("bio", value)}
            placeholder="Tell others a little about yourself"
            placeholderTextColor="#8793A5"
            style={[
              styles.input,
              styles.bioInput,
              fieldErrors.bio ? styles.inputInvalid : undefined,
            ]}
            textAlignVertical="top"
            value={bio}
          />
          {fieldErrors.bio ? (
            <ThemedText accessibilityRole="alert" style={styles.error}>
              {fieldErrors.bio}
            </ThemedText>
          ) : null}
        </View>

        {EDUCATION_FIELDS.map((field) => {
          const value = {
            university,
            faculty,
            degree,
            course,
            academicYear,
          }[field.name];
          const fieldError = fieldErrors[field.name];

          return (
            <View key={field.name} style={styles.field}>
              <ThemedText style={styles.label}>{field.label}</ThemedText>
              <TextInput
                accessibilityLabel={field.label}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isBusy}
                maxLength={field.maxLength}
                onChangeText={(text) => updateField(field.name, text)}
                placeholder={field.placeholder}
                placeholderTextColor="#8793A5"
                style={[
                  styles.input,
                  fieldError ? styles.inputInvalid : undefined,
                ]}
                value={value}
              />
              {fieldError ? (
                <ThemedText accessibilityRole="alert" style={styles.error}>
                  {fieldError}
                </ThemedText>
              ) : null}
            </View>
          );
        })}

        {successMessage ? (
          <ThemedText accessibilityRole="alert" style={styles.success}>
            {successMessage}
          </ThemedText>
        ) : null}
        {errorMessage ? (
          <ThemedText accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </ThemedText>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || isBusy) && styles.buttonMuted,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
          )}
        </Pressable>
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
    justifyContent: "center",
    padding: 24,
  },
  stateContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  stateText: {
    marginTop: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 8,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 20,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  profilePhoto: {
    backgroundColor: "#E2E8F0",
    borderRadius: 56,
    height: 112,
    width: 112,
  },
  photoPlaceholder: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 56,
    height: 112,
    justifyContent: "center",
    width: 112,
  },
  photoPlaceholderText: {
    color: "#475569",
  },
  photoUploadButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 46,
    paddingHorizontal: 20,
    width: "100%",
  },
  uploadProgress: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  field: {
    marginBottom: 20,
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
    paddingVertical: 12,
  },
  bioInput: {
    minHeight: 140,
  },
  inputInvalid: {
    borderColor: "#B42318",
  },
  error: {
    color: "#B42318",
    marginTop: 8,
  },
  success: {
    color: "#15803D",
    marginBottom: 16,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 20,
  },
  buttonMuted: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#3159A5",
    fontWeight: "700",
  },
});
