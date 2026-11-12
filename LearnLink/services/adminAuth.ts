import {
  getIdTokenResult,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

import { auth } from "../config/firebase";

export class AdminAccessDeniedError extends Error {
  constructor() {
    super("This account does not have administrator access.");
    this.name = "AdminAccessDeniedError";
  }
}

export async function signInAsAdmin(
  email: string,
  password: string
): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    const token = await getIdTokenResult(credential.user, true);

    if (token.claims.admin !== true) {
      await signOut(auth);
      throw new AdminAccessDeniedError();
    }

    return credential.user;
  } catch (error) {
    if (error instanceof AdminAccessDeniedError) {
      throw error;
    }

    if (auth.currentUser) {
      await signOut(auth);
    }

    throw new Error(getAdminAuthErrorMessage(error));
  }
}

export async function verifyAdminAccess(user: User): Promise<boolean> {
  const token = await getIdTokenResult(user, true);
  const isAdmin = token.claims.admin === true;

  if (!isAdmin && auth.currentUser?.uid === user.uid) {
    await signOut(auth);
  }

  return isAdmin;
}

export function getAdminAuthErrorMessage(error: unknown): string {
  if (error instanceof AdminAccessDeniedError) {
    return error.message;
  }

  if (!(error instanceof FirebaseError)) {
    return "Could not verify administrator access. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Could not sign in. Please try again.";
  }
}
