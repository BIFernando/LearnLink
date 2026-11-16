import { getIdTokenResult } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, defaultFunctions } from "../config/firebase";

export interface PublicProfileVisibility {
  userId: string;
  isDiscoverable: boolean;
}

type EmptyRequest = Record<string, never>;

const getVisibilityCallable = httpsCallable<
  EmptyRequest,
  PublicProfileVisibility
>(defaultFunctions, "getPublicProfileVisibility");
const enableVisibilityCallable = httpsCallable<
  EmptyRequest,
  PublicProfileVisibility
>(defaultFunctions, "enablePublicProfileVisibility");
const disableVisibilityCallable = httpsCallable<
  EmptyRequest,
  PublicProfileVisibility
>(defaultFunctions, "disablePublicProfileVisibility");

async function getVerifiedStudentUid(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sign in before changing public profile visibility.");
  }

  const { claims } = await getIdTokenResult(user, true);

  if (claims.email_verified !== true) {
    throw new Error("Verify your email before changing public profile visibility.");
  }

  if (claims.admin === true) {
    throw new Error("Admin accounts cannot manage student profile visibility.");
  }

  return user.uid;
}

function isVisibilityResult(value: unknown): value is PublicProfileVisibility {
  return (
    typeof value === "object" &&
    value !== null &&
    "userId" in value &&
    typeof value.userId === "string" &&
    "isDiscoverable" in value &&
    typeof value.isDiscoverable === "boolean"
  );
}

async function invokeVisibilityCallable(
  callable: typeof getVisibilityCallable,
): Promise<PublicProfileVisibility> {
  const uid = await getVerifiedStudentUid();
  const { data } = await callable({});

  if (!isVisibilityResult(data) || data.userId !== uid) {
    throw new Error("The visibility service returned an invalid response.");
  }

  return data;
}

export function getStudentPublicProfileVisibility(): Promise<PublicProfileVisibility> {
  return invokeVisibilityCallable(getVisibilityCallable);
}

export function enableStudentPublicProfileVisibility(): Promise<PublicProfileVisibility> {
  return invokeVisibilityCallable(enableVisibilityCallable);
}

export function disableStudentPublicProfileVisibility(): Promise<PublicProfileVisibility> {
  return invokeVisibilityCallable(disableVisibilityCallable);
}
