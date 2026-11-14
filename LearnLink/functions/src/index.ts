import { getApps, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type DocumentData,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const usersCollection = db.collection("users");
const publicProfilesCollection = db.collection("publicProfiles");

interface PublicRatings {
  ratingAverage: number;
  ratingCount: number;
}

function assertEmptyPayload(data: unknown): void {
  if (data === undefined || data === null) {
    return;
  }

  if (
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).length !== 0
  ) {
    throw new HttpsError(
      "invalid-argument",
      "This operation does not accept request fields.",
    );
  }
}

function requireVerifiedStudent(request: CallableRequest<unknown>): string {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in to manage profile visibility.");
  }

  if (auth.token.email_verified !== true) {
    throw new HttpsError(
      "permission-denied",
      "Verify your email before managing profile visibility.",
    );
  }

  if (auth.token.admin === true) {
    throw new HttpsError(
      "permission-denied",
      "Admin accounts cannot publish student profiles.",
    );
  }

  return auth.uid;
}

function requireProfileString(
  profile: DocumentData,
  field: string,
  maximumLength: number,
  required = false,
): string | undefined {
  const value: unknown = profile[field];

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpsError(
        "failed-precondition",
        "The private profile is missing a required display name.",
      );
    }

    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpsError(
      "failed-precondition",
      `The private profile field "${field}" is invalid.`,
    );
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength || (required && normalized.length === 0)) {
    throw new HttpsError(
      "failed-precondition",
      `The private profile field "${field}" is invalid.`,
    );
  }

  return normalized || undefined;
}

function requireHttpsUrl(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpsError(
      "failed-precondition",
      "The private profile photo URL is invalid.",
    );
  }

  if (url.protocol !== "https:") {
    throw new HttpsError(
      "failed-precondition",
      "The private profile photo URL must use HTTPS.",
    );
  }

  return url.toString();
}

function readExistingRatings(profile: DocumentData | undefined): PublicRatings {
  if (!profile) {
    return { ratingAverage: 0, ratingCount: 0 };
  }

  const ratingAverage = profile.ratingAverage ?? 0;
  const ratingCount = profile.ratingCount ?? 0;

  if (
    typeof ratingAverage !== "number" ||
    !Number.isFinite(ratingAverage) ||
    ratingAverage < 0 ||
    typeof ratingCount !== "number" ||
    !Number.isSafeInteger(ratingCount) ||
    ratingCount < 0
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The existing public rating summary is invalid.",
    );
  }

  return { ratingAverage, ratingCount };
}

function buildPublicProfile(
  uid: string,
  privateProfile: DocumentData,
  ratings: PublicRatings,
) {
  if (
    privateProfile.userId !== undefined &&
    privateProfile.userId !== uid
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The private profile does not match the authenticated account.",
    );
  }

  if (
    privateProfile.admin === true ||
    privateProfile.isAdmin === true ||
    privateProfile.role === "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Admin accounts cannot publish student profiles.",
    );
  }

  if (
    privateProfile.role !== undefined &&
    privateProfile.role !== "student"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only student profiles can be made public.",
    );
  }

  const displayName = requireProfileString(
    privateProfile,
    "displayName",
    100,
    true,
  );
  const bio = requireProfileString(privateProfile, "bio", 1000) ?? "";
  const location = requireProfileString(privateProfile, "location", 200);
  const profilePhotoUrl = requireHttpsUrl(
    requireProfileString(privateProfile, "profilePhotoUrl", 2048),
  );

  return {
    userId: uid,
    displayName,
    bio,
    ...(location ? { location } : {}),
    ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
    ratingAverage: ratings.ratingAverage,
    ratingCount: ratings.ratingCount,
    isDiscoverable: true,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export const enablePublicProfileVisibility = onCall(
  async (request: CallableRequest<unknown>) => {
    const uid = requireVerifiedStudent(request);
    assertEmptyPayload(request.data);
    const userRef = usersCollection.doc(uid);
    const publicProfileRef = publicProfilesCollection.doc(uid);

    try {
      await db.runTransaction(async (transaction) => {
        const privateSnapshot = await transaction.get(userRef);

        if (!privateSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "The student profile could not be found.",
          );
        }

        const existingPublicSnapshot = await transaction.get(publicProfileRef);
        const ratings = readExistingRatings(existingPublicSnapshot.data());
        const publicProfile = buildPublicProfile(
          uid,
          privateSnapshot.data() ?? {},
          ratings,
        );

        transaction.set(publicProfileRef, publicProfile);
      });

      return { userId: uid, isDiscoverable: true };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("Enabling public profile visibility failed.");
      throw new HttpsError(
        "internal",
        "Could not enable profile visibility. Please try again.",
      );
    }
  },
);

export const disablePublicProfileVisibility = onCall(
  async (request: CallableRequest<unknown>) => {
    const uid = requireVerifiedStudent(request);
    assertEmptyPayload(request.data);
    const userRef = usersCollection.doc(uid);
    const publicProfileRef = publicProfilesCollection.doc(uid);

    try {
      await db.runTransaction(async (transaction) => {
        const privateSnapshot = await transaction.get(userRef);

        if (!privateSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "The student profile could not be found.",
          );
        }

        transaction.delete(publicProfileRef);
      });

      return { userId: uid, isDiscoverable: false };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("Disabling public profile visibility failed.");
      throw new HttpsError(
        "internal",
        "Could not disable profile visibility. Please try again.",
      );
    }
  },
);
