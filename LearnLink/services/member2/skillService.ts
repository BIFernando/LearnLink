import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { auth, db } from "@/config/firebase";
import {
  SESSION_MODES,
  SKILL_LEVELS,
  SKILL_TYPES,
  type SessionMode,
  type SkillCatalogItem,
  type SkillCategory,
  type SkillSuggestionInput,
  type StudentDirectoryProfile,
  type StudentSkill,
  type UserSkillInput,
} from "@/types/member2/skills";

const SKILL_PAGE_SIZE = 30;

export interface DiscoverPage {
  students: StudentDirectoryProfile[];
  lastDocument: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

function requireCurrentUserId(): string {
  const userId = auth.currentUser?.uid;

  if (!userId) {
    throw new Error("Sign in to view and manage skills.");
  }

  return userId;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapCatalogItem(id: string, data: DocumentData): SkillCatalogItem | null {
  const name = optionalString(data.name);

  if (!name) {
    console.warn(`Skipping catalog skill ${id}: it has no valid name.`);
    return null;
  }

  return {
    id,
    name,
    description: optionalString(data.description),
    categoryId: optionalString(data.categoryId),
  };
}

function mapCategory(id: string, data: DocumentData): SkillCategory | null {
  const name = optionalString(data.name);

  if (!name) {
    console.warn(`Skipping skill category ${id}: it has no valid name.`);
    return null;
  }

  return {
    id,
    name,
    description: optionalString(data.description),
  };
}

function mapStudentSkill(
  id: string,
  data: DocumentData,
  catalog: Map<string, SkillCatalogItem>,
): StudentSkill | null {
  const userId = optionalString(data.userId);
  const skillId = optionalString(data.skillId);
  const type = SKILL_TYPES.find((value) => value === data.type);
  const proficiencyLevel = SKILL_LEVELS.find(
    (value) => value === data.proficiencyLevel,
  );

  if (!userId || !skillId || !type) {
    console.warn(`Skipping user skill ${id}: required fields are invalid.`);
    return null;
  }

  const skillName =
    optionalString(data.skillName) ??
    catalog.get(skillId)?.name ??
    "Unavailable skill";
  const sessionModes = Array.isArray(data.sessionModes)
    ? data.sessionModes.filter((value): value is SessionMode =>
        SESSION_MODES.includes(value),
      )
    : [];
  const yearsExperience =
    Number.isInteger(data.yearsExperience) &&
    data.yearsExperience >= 0 &&
    data.yearsExperience <= 50
      ? data.yearsExperience
      : undefined;

  return {
    id,
    userId,
    skillId,
    skillName,
    categoryId:
      optionalString(data.categoryId) ??
      catalog.get(skillId)?.categoryId,
    type,
    proficiencyLevel: proficiencyLevel ?? "BEGINNER",
    description: optionalString(data.description),
    yearsExperience,
    sessionModes,
    availability: optionalString(data.availability),
    createdAt: data.createdAt,
  };
}

function mapStudentProfile(
  userId: string,
  data: DocumentData,
): Omit<StudentDirectoryProfile, "skills"> {
  return {
    userId,
    displayName:
      optionalString(data.displayName) ??
      optionalString(data.name) ??
      "LearnLink Student",
    profilePhotoUrl: optionalString(data.profilePhotoUrl),
    bio: optionalString(data.bio),
    location: optionalString(data.location),
    universityId: optionalString(data.universityId),
    university:
      optionalString(data.universityName) ??
      optionalString(data.university) ??
      optionalString(data.universityId),
    faculty: optionalString(data.faculty),
    course: optionalString(data.course),
    ratingAverage:
      typeof data.ratingAverage === "number" ? data.ratingAverage : undefined,
    ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : undefined,
  };
}

export async function getSkillCatalog(): Promise<SkillCatalogItem[]> {
  requireCurrentUserId();
  const snapshot = await getDocs(collection(db, "skills"));

  return snapshot.docs
    .map((document) => mapCatalogItem(document.id, document.data()))
    .filter((record): record is SkillCatalogItem => record !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getSkillCategories(): Promise<SkillCategory[]> {
  requireCurrentUserId();
  const snapshot = await getDocs(collection(db, "categories"));

  return snapshot.docs
    .map((document) => mapCategory(document.id, document.data()))
    .filter((record): record is SkillCategory => record !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getMySkills(): Promise<StudentSkill[]> {
  const userId = requireCurrentUserId();
  const [skillSnapshot, catalog] = await Promise.all([
    getDocs(query(collection(db, "userSkills"), where("userId", "==", userId))),
    getSkillCatalog(),
  ]);
  const catalogById = new Map(catalog.map((skill) => [skill.id, skill]));

  return skillSnapshot.docs
    .map((document) =>
      mapStudentSkill(document.id, document.data(), catalogById),
    )
    .filter((skill): skill is StudentSkill => skill !== null)
    .sort((left, right) => left.skillName.localeCompare(right.skillName));
}

export async function saveUserSkill(input: UserSkillInput, skillEntryId?: string) {
  const userId = requireCurrentUserId();
  const skillId = input.skillId.trim();
  const description = input.description.trim();
  const availability = input.availability.trim();

  if (!skillId) {
    throw new Error("Choose a skill from the catalog.");
  }
  if (!SKILL_TYPES.includes(input.type)) {
    throw new Error("Choose whether you are offering or seeking this skill.");
  }
  if (!SKILL_LEVELS.includes(input.proficiencyLevel)) {
    throw new Error("Choose a valid proficiency level.");
  }
  if (
    !Number.isInteger(input.yearsExperience) ||
    input.yearsExperience < 0 ||
    input.yearsExperience > 50
  ) {
    throw new Error("Years of experience must be between 0 and 50.");
  }
  if (
    input.sessionModes.length === 0 ||
    input.sessionModes.some((mode) => !SESSION_MODES.includes(mode))
  ) {
    throw new Error("Choose at least one session format.");
  }
  if (description.length > 500 || availability.length > 200) {
    throw new Error("Descriptions must be 500 characters and availability 200 characters or fewer.");
  }

  const catalogSnapshot = await getDoc(doc(db, "skills", skillId));
  if (!catalogSnapshot.exists()) {
    throw new Error("This skill is no longer in the catalog. Choose another skill.");
  }

  const catalogItem = mapCatalogItem(skillId, catalogSnapshot.data());
  if (!catalogItem) {
    throw new Error("This skill has invalid catalog data and cannot be saved.");
  }

  const skillData = {
    userId,
    skillId: catalogItem.id,
    skillName: catalogItem.name,
    categoryId: catalogItem.categoryId ?? null,
    type: input.type,
    proficiencyLevel: input.proficiencyLevel,
    description: description || null,
    yearsExperience: input.yearsExperience,
    sessionModes: input.sessionModes,
    availability: availability || null,
    updatedAt: serverTimestamp(),
  };

  const existingSkills = await getMySkills();
  if (
    existingSkills.some(
      (skill) =>
        skill.id !== skillEntryId &&
        skill.skillId === catalogItem.id &&
        skill.type === input.type,
    )
  ) {
    throw new Error("This skill is already in your portfolio for that category.");
  }

  if (skillEntryId) {
    const skillRef = doc(db, "userSkills", skillEntryId);
    const existingSkill = await getDoc(skillRef);

    if (!existingSkill.exists() || existingSkill.data().userId !== userId) {
      throw new Error("You can only edit skills in your own portfolio.");
    }

    await updateDoc(skillRef, skillData);
    return skillEntryId;
  }

  const skillRef = await addDoc(collection(db, "userSkills"), {
    ...skillData,
    createdAt: serverTimestamp(),
  });
  return skillRef.id;
}

export async function deleteUserSkill(skillEntryId: string): Promise<void> {
  const userId = requireCurrentUserId();
  const skillRef = doc(db, "userSkills", skillEntryId);
  const skillSnapshot = await getDoc(skillRef);

  if (!skillSnapshot.exists() || skillSnapshot.data().userId !== userId) {
    throw new Error("You can only remove skills from your own portfolio.");
  }

  await deleteDoc(skillRef);
}

export async function suggestSkill(input: SkillSuggestionInput): Promise<string> {
  const userId = requireCurrentUserId();
  const name = input.name.trim();
  const description = input.description.trim();

  if (!name || name.length > 100) {
    throw new Error("Skill names must be between 1 and 100 characters.");
  }
  if (description.length > 500) {
    throw new Error("Suggestion descriptions must be 500 characters or fewer.");
  }

  const existingSkills = await getSkillCatalog();
  if (
    existingSkills.some(
      (skill) => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  ) {
    throw new Error("This skill is already available in the catalog.");
  }

  const categoryId = input.categoryId.trim();
  if (categoryId && !(await getDoc(doc(db, "categories", categoryId))).exists()) {
    throw new Error("The selected category no longer exists.");
  }

  const suggestion = await addDoc(collection(db, "skillSuggestions"), {
    name,
    categoryId: categoryId || null,
    description: description || null,
    submittedBy: userId,
    status: "PENDING",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return suggestion.id;
}

export async function getDiscoverPage(
  lastDocument: QueryDocumentSnapshot<DocumentData> | null,
): Promise<DiscoverPage> {
  const currentUserId = requireCurrentUserId();
  const offerQuery = query(
    collection(db, "userSkills"),
    where("type", "==", "OFFER"),
    ...(lastDocument ? [startAfter(lastDocument)] : []),
    limit(SKILL_PAGE_SIZE + 1),
  );
  const [offerSnapshot, catalog] = await Promise.all([
    getDocs(offerQuery),
    getSkillCatalog(),
  ]);
  const visibleDocuments = offerSnapshot.docs.slice(0, SKILL_PAGE_SIZE);
  const catalogById = new Map(catalog.map((skill) => [skill.id, skill]));
  const userIds = [
    ...new Set(
      visibleDocuments
        .map((document) => optionalString(document.data().userId))
        .filter((userId): userId is string => Boolean(userId && userId !== currentUserId)),
    ),
  ];
  const profileSnapshots = await Promise.all(
    userIds.map((userId) => getDoc(doc(db, "users", userId))),
  );
  const profilesById = new Map<
    string,
    Omit<StudentDirectoryProfile, "skills">
  >();

  profileSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) {
      console.warn(`Skipping discovery profile ${userIds[index]}: profile not found.`);
      return;
    }
    if (snapshot.data().isActive === false) {
      return;
    }

    profilesById.set(
      userIds[index],
      mapStudentProfile(userIds[index], snapshot.data()),
    );
  });

  const studentsById = new Map<string, StudentDirectoryProfile>();
  for (const document of visibleDocuments) {
    const skill = mapStudentSkill(
      document.id,
      document.data(),
      catalogById,
    );

    if (!skill || skill.type !== "OFFER" || skill.userId === currentUserId) {
      continue;
    }

    const profile = profilesById.get(skill.userId);
    if (!profile) {
      continue;
    }

    const existingStudent = studentsById.get(skill.userId);
    if (existingStudent) {
      existingStudent.skills.push(skill);
    } else {
      studentsById.set(skill.userId, { ...profile, skills: [skill] });
    }
  }

  const students = [...studentsById.values()];
  students.forEach((student) => {
    student.skills.sort((left, right) =>
      left.skillName.localeCompare(right.skillName),
    );
  });
  students.sort((left, right) => left.displayName.localeCompare(right.displayName));

  return {
    students,
    lastDocument:
      visibleDocuments.length > 0
        ? visibleDocuments[visibleDocuments.length - 1]
        : null,
    hasMore: offerSnapshot.docs.length > SKILL_PAGE_SIZE,
  };
}

export async function getStudentDirectoryProfile(
  userId: string,
): Promise<StudentDirectoryProfile | null> {
  requireCurrentUserId();
  if (!userId.trim()) {
    throw new Error("A student ID is required.");
  }

  const [profileSnapshot, skillSnapshot, catalog] = await Promise.all([
    getDoc(doc(db, "users", userId)),
    getDocs(query(collection(db, "userSkills"), where("userId", "==", userId))),
    getSkillCatalog(),
  ]);

  if (!profileSnapshot.exists() || profileSnapshot.data().isActive === false) {
    return null;
  }

  const catalogById = new Map(catalog.map((skill) => [skill.id, skill]));
  const skills = skillSnapshot.docs
    .map((document) =>
      mapStudentSkill(document.id, document.data(), catalogById),
    )
    .filter((skill): skill is StudentSkill => skill !== null)
    .sort((left, right) => left.skillName.localeCompare(right.skillName));

  return {
    ...mapStudentProfile(userId, profileSnapshot.data()),
    skills,
  };
}
