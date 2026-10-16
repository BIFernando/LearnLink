import { auth } from "../../config/firebase";

/**
 * Returns the UID of the currently signed-in Firebase user.
 * Throws an error if nobody is signed in.
 */
export function getCurrentUserId(): string {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No user is signed in. Please log in first.");
  }

  return user.uid;
}