import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { auth, db } from "../config/firebase";
import { verifyAdminAccess } from "./adminAuth";

const USER_PAGE_SIZE = 20;
const USER_SKILL_LIMIT = 100;

export interface AdminUserRecord {
  id: string;
  displayName?: string;
  email?: string;
  universityId?: string;
  isActive?: boolean;
}

export interface AdminUserPage {
  users: AdminUserRecord[];
  lastDocument: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface AdminUserSkill {
  id: string;
  name: string;
  details: { label: string; value: string }[];
}

export interface AdminUserDetails extends AdminUserRecord {
  location?: string;
  bio?: string;
  profilePhotoUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
  skillCredits?: number;
  skills: AdminUserSkill[];
  skillsMayBeTruncated: boolean;
}

export class AdminUsersAccessError extends Error {
  constructor() {
    super("Administrator access is required to view user records.");
    this.name = "AdminUsersAccessError";
  }
}

export class AdminUserNotFoundError extends Error {
  constructor() {
    super("The selected user could not be found.");
    this.name = "AdminUserNotFoundError";
  }
}

async function assertAdmin(user: User | null): Promise<void> {
  if (!user || !(await verifyAdminAccess(user))) {
    throw new AdminUsersAccessError();
  }

  if (auth.currentUser?.uid !== user.uid) {
    throw new AdminUsersAccessError();
  }
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function toUserRecord(
  id: string,
  data: DocumentData
): AdminUserRecord {
  const isActive =
    typeof data.isActive === "boolean" ? data.isActive : undefined;

  return {
    id,
    displayName:
      optionalString(data.displayName) ?? optionalString(data.name),
    email: optionalString(data.email),
    universityId: optionalString(data.universityId),
    isActive,
  };
}

export async function getAdminUsersPage(
  lastDocument: QueryDocumentSnapshot<DocumentData> | null
): Promise<AdminUserPage> {
  await assertAdmin(auth.currentUser);

  const usersQuery = query(
    collection(db, "users"),
    orderBy(documentId()),
    ...(lastDocument ? [startAfter(lastDocument)] : []),
    limit(USER_PAGE_SIZE + 1)
  );
  const snapshot = await getDocs(usersQuery);
  const visibleDocuments = snapshot.docs.slice(0, USER_PAGE_SIZE);
  const nextCursor =
    visibleDocuments.length > 0
      ? visibleDocuments[visibleDocuments.length - 1]
      : null;

  return {
    users: visibleDocuments.map((userDocument) =>
      toUserRecord(userDocument.id, userDocument.data())
    ),
    lastDocument: nextCursor,
    hasMore: snapshot.docs.length > USER_PAGE_SIZE,
  };
}

export async function getAdminUserDetails(
  userId: string
): Promise<AdminUserDetails> {
  await assertAdmin(auth.currentUser);

  const userReference = doc(db, "users", userId);
  const skillsQuery = query(
    collection(db, "userSkills"),
    where("userId", "==", userId),
    limit(USER_SKILL_LIMIT + 1)
  );
  const [userSnapshot, skillsSnapshot] = await Promise.all([
    getDoc(userReference),
    getDocs(skillsQuery),
  ]);

  if (!userSnapshot.exists()) {
    throw new AdminUserNotFoundError();
  }

  const data = userSnapshot.data();
  const skillDocuments = skillsSnapshot.docs.slice(0, USER_SKILL_LIMIT);
  const skills = skillDocuments.map((skillDocument) => {
    const skillData = skillDocument.data();
    const name =
      optionalString(skillData.skillName) ??
      optionalString(skillData.name) ??
      optionalString(skillData.skill) ??
      optionalString(skillData.skillId) ??
      skillDocument.id;
    const details: { label: string; value: string }[] = [];

    for (const [field, label] of [
      ["level", "Level"],
      ["proficiency", "Proficiency"],
      ["category", "Category"],
      ["categoryId", "Category ID"],
    ]) {
      const value = optionalString(skillData[field]);
      if (value) {
        details.push({ label, value });
      }
    }

    return { id: skillDocument.id, name, details };
  });

  return {
    ...toUserRecord(userSnapshot.id, data),
    location: optionalString(data.location),
    bio: optionalString(data.bio),
    profilePhotoUrl: optionalString(data.profilePhotoUrl),
    ratingAverage: optionalNumber(data.ratingAverage),
    ratingCount: optionalNumber(data.ratingCount),
    skillCredits: optionalNumber(data.skillCredits),
    skills,
    skillsMayBeTruncated: skillsSnapshot.size > USER_SKILL_LIMIT,
  };
}
