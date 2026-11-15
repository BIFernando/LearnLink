import { doc, updateDoc } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type StorageReference,
} from "firebase/storage";

import { auth, db, storage } from "@/config/firebase";
import {
  studentProfileUpdateSchema,
  type StudentProfileUpdate,
} from "@/schemas/studentProfile";

export async function saveStudentProfileToFirestore(
  input: unknown,
): Promise<StudentProfileUpdate> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sign in before updating your profile.");
  }

  const profile = studentProfileUpdateSchema.parse(input);
  const profileUpdates = {
    displayName: profile.displayName,
    bio: profile.bio,
    ...(profile.university !== undefined
      ? { university: profile.university }
      : {}),
    ...(profile.faculty !== undefined ? { faculty: profile.faculty } : {}),
    ...(profile.degree !== undefined ? { degree: profile.degree } : {}),
    ...(profile.course !== undefined ? { course: profile.course } : {}),
    ...(profile.academicYear !== undefined
      ? { academicYear: profile.academicYear }
      : {}),
  };

  await updateDoc(doc(db, "users", user.uid), profileUpdates);

  return profile;
}

export interface StudentProfilePhotoAsset {
  uri: string;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string | null;
}

export interface StudentProfilePhotoUploadResult {
  profilePhotoUrl: string;
  previousPhotoCleanupFailed: boolean;
}

export type StudentProfilePhotoProgressHandler = (progress: number) => void;

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function mimeTypeFromExtension(fileName: string): string | undefined {
  const extension = fileName
    .split(/[?#]/, 1)[0]
    .split(".")
    .pop()
    ?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "webp") {
    return "image/webp";
  }

  return undefined;
}

function getImageContentType(
  asset: StudentProfilePhotoAsset,
  blob: Blob,
): string {
  const blobType = blob.type.trim().toLowerCase();
  const assetType = asset.mimeType?.trim().toLowerCase();
  const isGenericBlobType =
    blobType === "" || blobType === "application/octet-stream";

  if (!isGenericBlobType && !ALLOWED_IMAGE_TYPES.has(blobType)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  if (
    isGenericBlobType &&
    assetType &&
    !ALLOWED_IMAGE_TYPES.has(assetType)
  ) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  const contentType = ALLOWED_IMAGE_TYPES.has(blobType)
    ? blobType
    : assetType && ALLOWED_IMAGE_TYPES.has(assetType)
      ? assetType
      : mimeTypeFromExtension(asset.fileName ?? asset.uri);

  if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  return contentType;
}

function getPreviousProfilePhotoReference(
  profilePhotoUrl: string | undefined,
  userId: string,
): StorageReference | null {
  if (!profilePhotoUrl) {
    return null;
  }

  try {
    const previousReference = ref(storage, profilePhotoUrl);
    const profilePhotoPrefix = `profilePictures/${userId}/`;

    if (
      previousReference.bucket === storage.app.options.storageBucket &&
      previousReference.fullPath.startsWith(profilePhotoPrefix)
    ) {
      return previousReference;
    }
  } catch (error) {
    console.warn("Could not resolve the previous profile picture.", error);
  }

  return null;
}

export async function uploadAndSaveStudentProfilePhoto(
  asset: StudentProfilePhotoAsset,
  previousPhotoUrl: string | undefined,
  onProgress?: StudentProfilePhotoProgressHandler,
): Promise<StudentProfilePhotoUploadResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sign in before updating your profile picture.");
  }

  if (asset.fileSize !== undefined && asset.fileSize > MAX_PROFILE_PHOTO_SIZE) {
    throw new Error("Profile pictures must be 5 MB or smaller.");
  }

  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new Error("Could not read the selected profile picture.");
  }

  const blob = await response.blob();
  if (blob.size === 0 || blob.size > MAX_PROFILE_PHOTO_SIZE) {
    throw new Error("Profile pictures must be greater than 0 bytes and no larger than 5 MB.");
  }

  const contentType = getImageContentType(asset, blob);
  const extension =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : "webp";
  const uniqueFileName = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;
  const photoReference = ref(
    storage,
    `profilePictures/${user.uid}/${uniqueFileName}`,
  );
  const uploadTask = uploadBytesResumable(photoReference, blob, {
    contentType,
  });

  try {
    const unsubscribe = uploadTask.on("state_changed", (snapshot) => {
      const progress =
        snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
      onProgress?.(progress);
    });

    try {
      await uploadTask;
    } finally {
      unsubscribe();
    }

    const profilePhotoUrl = await getDownloadURL(photoReference);
    await updateDoc(doc(db, "users", user.uid), { profilePhotoUrl });

    let previousPhotoCleanupFailed = false;
    const previousReference = getPreviousProfilePhotoReference(
      previousPhotoUrl,
      user.uid,
    );

    if (
      previousReference &&
      previousReference.fullPath !== photoReference.fullPath
    ) {
      try {
        await deleteObject(previousReference);
      } catch (cleanupError) {
        console.error("Could not remove the previous profile picture.", cleanupError);
        previousPhotoCleanupFailed = true;
      }
    }

    return { profilePhotoUrl, previousPhotoCleanupFailed };
  } catch (error) {
    try {
      await deleteObject(photoReference);
    } catch (cleanupError) {
      console.error("Could not remove the failed profile picture upload.", cleanupError);
    }

    throw error;
  }
}
