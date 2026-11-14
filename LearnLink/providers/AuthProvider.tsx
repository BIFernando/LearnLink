import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  reload,
  type User as FirebaseUser,
} from "firebase/auth";

import { auth, db } from "@/config/firebase";
import type { StudentProfile } from "@/types/auth";

interface AuthContextValue {
  user: FirebaseUser | null;
  studentProfile: StudentProfile | null;
  isLoading: boolean;
  isEmailVerified: boolean;
  refreshEmailVerification: () => Promise<boolean>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let authChangeId = 0;

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        const currentAuthChangeId = ++authChangeId;

        setUser(firebaseUser);
        setIsEmailVerified(firebaseUser?.emailVerified ?? false);
        setStudentProfile(null);
        setError(null);
        setIsLoading(Boolean(firebaseUser));

        if (!firebaseUser) {
          return;
        }

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
      },
      (error) => {
        if (!isActive) {
          return;
        }

        authChangeId += 1;
        console.error("Firebase authentication state listener failed.", error);
        setUser(null);
        setIsEmailVerified(false);
        setStudentProfile(null);
        setError(error.message);
        setIsLoading(false);
      },
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  async function refreshEmailVerification(): Promise<boolean> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No signed-in user is available to verify.");
    }

    await reload(currentUser);
    const emailVerified = currentUser.emailVerified;
    setIsEmailVerified(emailVerified);
    return emailVerified;
  }

  const value: AuthContextValue = {
    user,
    studentProfile,
    isLoading,
    isEmailVerified,
    refreshEmailVerification,
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
