import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

import { auth, db } from "@/config/firebase";
import type { StudentProfile } from "@/types/auth";

interface AuthContextValue {
  user: FirebaseUser | null;
  studentProfile: StudentProfile | null;
  isLoading: boolean;
  isEmailVerified: boolean;
<<<<<<< Updated upstream
=======
  refreshEmailVerification: () => Promise<boolean>;
  refreshStudentProfile: () => Promise<void>;
  saveStudentProfile: (profile: StudentProfileUpdate) => Promise<void>;
  uploadStudentProfilePhoto: (
    asset: StudentProfilePhotoAsset,
    onProgress?: StudentProfilePhotoProgressHandler,
  ) => Promise<StudentProfilePhotoUploadResult>;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    let isActive = true;
    let authChangeId = 0;
=======
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
>>>>>>> Stashed changes

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
<<<<<<< Updated upstream
        const currentAuthChangeId = ++authChangeId;
=======
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
>>>>>>> Stashed changes

        setUser(firebaseUser);
        setStudentProfile(null);
        setError(null);
        setIsLoading(Boolean(firebaseUser));

        if (!firebaseUser) {
          setIsLoading(false);
          return;
        }

<<<<<<< Updated upstream
        const loadStudentProfile = async () => {
          try {
            const profileSnapshot = await getDoc(
              doc(db, "users", firebaseUser.uid),
            );

            if (!isActive || currentAuthChangeId !== authChangeId) {
              return;
            }

            if (profileSnapshot.exists()) {
              setStudentProfile({
                ...profileSnapshot.data(),
                userId: firebaseUser.uid,
              });
            }
          } catch (error) {
            if (!isActive || currentAuthChangeId !== authChangeId) {
              return;
            }

            const message =
              error instanceof Error
                ? error.message
                : "Failed to load the student profile.";

            console.error("Failed to load the current student profile.", error);
            setError(message);
          } finally {
            if (isActive && currentAuthChangeId === authChangeId) {
              setIsLoading(false);
            }
          }
        };

        void loadStudentProfile();
=======
        void loadStudentProfile(firebaseUser, currentAuthChangeId);
>>>>>>> Stashed changes
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

  const value: AuthContextValue = {
    user,
    studentProfile,
    isLoading,
<<<<<<< Updated upstream
    isEmailVerified: user?.emailVerified ?? false,
=======
    isEmailVerified,
    refreshEmailVerification,
    refreshStudentProfile,
    saveStudentProfile: saveCurrentStudentProfile,
    uploadStudentProfilePhoto: uploadCurrentStudentProfilePhoto,
>>>>>>> Stashed changes
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
