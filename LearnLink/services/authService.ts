import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "../config/firebase";
import {
  studentLoginSchema,
  studentRegistrationSchema,
  type StudentLoginValues,
  type StudentRegistrationValues,
} from "../schemas/auth";

type RegistrationFailureStage =
  | "validation"
  | "account_creation"
  | "profile_creation"
  | "email_verification";

interface RegistrationErrorDetails {
  stage: RegistrationFailureStage;
  code?: string;
  userId?: string;
  cause?: unknown;
}

export class StudentRegistrationError extends Error {
  readonly stage: RegistrationFailureStage;
  readonly code?: string;
  readonly userId?: string;
  readonly originalError?: unknown;

  constructor(message: string, details: RegistrationErrorDetails) {
    super(message);
    this.name = "StudentRegistrationError";
    this.stage = details.stage;
    this.code = details.code;
    this.userId = details.userId;
    this.originalError = details.cause;
  }
}

export interface RegisterStudentResult {
  userId: string;
  email: string;
  status: "unverified";
  emailVerificationSent: true;
}

function getFirebaseCode(error: unknown): string | undefined {
  return error instanceof FirebaseError ? error.code : undefined;
}

export async function registerStudent(
  registration: StudentRegistrationValues,
): Promise<RegisterStudentResult> {
  const validation = studentRegistrationSchema.safeParse(registration);

  if (!validation.success) {
    throw new StudentRegistrationError(
      validation.error.issues.map((issue) => issue.message).join(" "),
      {
        stage: "validation",
        cause: validation.error,
      },
    );
  }

  const { fullName, email, password } = validation.data;

  let user;
  try {
    ({ user } = await createUserWithEmailAndPassword(auth, email, password));
  } catch (error) {
    const code = getFirebaseCode(error);
    const message =
      code === "auth/email-already-in-use"
        ? "An account with this email already exists."
        : code === "auth/weak-password"
          ? "The password does not meet Firebase's requirements."
          : "Could not create the student account. Please try again.";

    throw new StudentRegistrationError(message, {
      stage: "account_creation",
      code,
      cause: error,
    });
  }

  try {
    await setDoc(doc(db, "users", user.uid), {
      userId: user.uid,
      email,
      displayName: fullName,
      status: "unverified",
    });
  } catch (error) {
    throw new StudentRegistrationError(
      "The authentication account was created, but its student profile could not be saved. Do not register again; contact support and provide your user ID.",
      {
        stage: "profile_creation",
        code: getFirebaseCode(error),
        userId: user.uid,
        cause: error,
      },
    );
  }

  try {
    await sendEmailVerification(user);
  } catch (error) {
    throw new StudentRegistrationError(
      "The account and profile were created, but the verification email could not be sent. Request another verification email or contact support before trying to register again.",
      {
        stage: "email_verification",
        code: getFirebaseCode(error),
        userId: user.uid,
        cause: error,
      },
    );
  }

  return {
    userId: user.uid,
    email,
    status: "unverified",
    emailVerificationSent: true,
  };
}

export async function signInStudent(
  credentials: StudentLoginValues,
): Promise<User> {
  const { email, password } = studentLoginSchema.parse(credentials);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function sendStudentPasswordResetEmail(
  email: string,
): Promise<void> {
  const normalizedEmail = studentLoginSchema.shape.email.parse(email);
  await sendPasswordResetEmail(auth, normalizedEmail);
}

export async function signOutStudent(): Promise<void> {
  await signOut(auth);
}
