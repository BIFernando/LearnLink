import {
  onAuthStateChanged,
  reload,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { auth, db } from "@/config/firebase";
import type { StudentProfileUpdate } from "@/schemas/studentProfile";
import {
  saveStudentProfileToFirestore,
  uploadAndSaveStudentProfilePhoto,
  type StudentProfilePhotoAsset,
  type StudentProfilePhotoProgressHandler,
  type StudentProfilePhotoUploadResult,
} from "@/services/studentProfileService";
import type { StudentProfile } from "@/types/auth";

interface AuthContextValue {
  user: FirebaseUser | null;
  studentProfile: StudentProfile | null;
  isLoading: boolean;
  isEmailVerified: boolean;

  refreshEmailVerification: () => Promise<boolean>;
  refreshStudentProfile: () => Promise<void>;

  saveStudentProfile: (profile: StudentProfileUpdate) => Promise<void>;
  uploadStudentProfilePhoto: (
    asset: StudentProfilePhotoAsset,
    onProgress?: StudentProfilePhotoProgressHandler,
  ) => Promise<StudentProfilePhotoUploadResult>;

  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Reload mutates the current Firebase user without changing its identity.
  const [, refreshContext] = useReducer((revision: number) => revision + 1, 0);
  const authChangeId = useRef(0);
  const profileLoadId = useRef(0);
  const isMounted = useRef(false);

  const loadStudentProfile = useCallback(
    async (firebaseUser: FirebaseUser, currentAuthChangeId: number) => {
      const currentProfileLoadId = ++profileLoadId.current;
      const isCurrentRequest = () =>
        isMounted.current &&
        currentAuthChangeId === authChangeId.current &&
        currentProfileLoadId === profileLoadId.current &&
        auth.currentUser?.uid === firebaseUser.uid;

      setStudentProfile(null);
      setError(null);
      setIsLoading(true);

      try {
        if (__DEV__) {
          console.log("[AuthProvider] Firestore student profile load started.");
        }

        const profileSnapshot = await getDoc(
          doc(db, "users", firebaseUser.uid),
        );

        if (__DEV__) {
          console.log("[AuthProvider] Firestore student profile load completed.");
        }

        if (!isCurrentRequest()) {
          return;
        }

        if (profileSnapshot.exists()) {
          setStudentProfile({
            ...profileSnapshot.data(),
            userId: firebaseUser.uid,
          });
        }
      } catch (loadError) {
        if (!isCurrentRequest()) {
          return;
        }

        if (__DEV__) {
          console.log("[AuthProvider] Firestore student profile load failed.");
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load the student profile.";

        console.error("Failed to load the current student profile.", loadError);
        setError(message);
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (__DEV__) {
      console.log("[AuthProvider] isLoading state:", isLoading);
    }
  }, [isLoading]);

  useEffect(() => {
    isMounted.current = true;
    let hasReceivedInitialAuthCallback = false;

    if (__DEV__) {
      console.log("[AuthProvider] Waiting for initial Firebase auth callback.");
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (!hasReceivedInitialAuthCallback) {
          hasReceivedInitialAuthCallback = true;
          if (__DEV__) {
            console.log("[AuthProvider] Initial Firebase auth callback executed.");
            console.log(
              "[AuthProvider] firebaseUser === null:",
              firebaseUser === null,
            );
          }
        }

        const currentAuthChangeId = ++authChangeId.current;
        profileLoadId.current += 1;

        setUser(firebaseUser);
        setStudentProfile(null);
        setError(null);
        setIsLoading(Boolean(firebaseUser));

        if (!firebaseUser) {
          setIsLoading(false);
          return;
        }

        void loadStudentProfile(firebaseUser, currentAuthChangeId);
      },
      (listenerError) => {
        if (!isMounted.current) {
          return;
        }

        authChangeId.current += 1;
        profileLoadId.current += 1;
        console.error(
          "Firebase authentication state listener failed.",
          listenerError,
        );
        setUser(null);
        setStudentProfile(null);
        setError(listenerError.message);
        setIsLoading(false);
      },
    );

    return () => {
      isMounted.current = false;
      authChangeId.current += 1;
      profileLoadId.current += 1;
      unsubscribe();
    };
  }, [loadStudentProfile]);

  const refreshStudentProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    await loadStudentProfile(currentUser, authChangeId.current);
  }, [loadStudentProfile]);

  async function refreshEmailVerification(): Promise<boolean> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No signed-in user is available to verify.");
    }

    await reload(currentUser);
    const emailVerified = currentUser.emailVerified;
    refreshContext();
    return emailVerified;
  }

  async function saveCurrentStudentProfile(
    profile: StudentProfileUpdate,
  ): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Sign in before updating your profile.");
    }

    const updatedProfile = await saveStudentProfileToFirestore(profile);

    if (auth.currentUser?.uid !== currentUser.uid) {
      return;
    }

    setStudentProfile((currentProfile) =>
      currentProfile?.userId === currentUser.uid
        ? { ...currentProfile, ...updatedProfile }
        : { userId: currentUser.uid, ...updatedProfile },
    );
  }

  async function uploadCurrentStudentProfilePhoto(
    asset: StudentProfilePhotoAsset,
    onProgress?: StudentProfilePhotoProgressHandler,
  ): Promise<StudentProfilePhotoUploadResult> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Sign in before updating your profile picture.");
    }

    const currentProfile =
      studentProfile?.userId === currentUser.uid ? studentProfile : null;
    if (!currentProfile) {
      throw new Error("Your student profile is not available.");
    }

    const result = await uploadAndSaveStudentProfilePhoto(
      asset,
      typeof currentProfile.profilePhotoUrl === "string"
        ? currentProfile.profilePhotoUrl
        : undefined,
      onProgress,
    );

    if (auth.currentUser?.uid === currentUser.uid) {
      setStudentProfile((profile) =>
        profile?.userId === currentUser.uid
          ? { ...profile, profilePhotoUrl: result.profilePhotoUrl }
          : profile,
      );
    }

    return result;
  }

  const value: AuthContextValue = {
    user,
    studentProfile,
    isLoading,
    isEmailVerified: user?.emailVerified ?? false,
    refreshEmailVerification,
    refreshStudentProfile,
    saveStudentProfile: saveCurrentStudentProfile,
    uploadStudentProfilePhoto: uploadCurrentStudentProfilePhoto,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
