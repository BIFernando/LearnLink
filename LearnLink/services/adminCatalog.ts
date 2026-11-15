import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { auth, db } from "../config/firebase";
import { verifyAdminAccess } from "./adminAuth";

const CATALOG_PAGE_SIZE = 30;

export interface AdminCatalogRecord {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  createdBy?: string;
  createdAt?: Date;
  editable: boolean;
}

export interface AdminCatalogPage {
  records: AdminCatalogRecord[];
  lastDocument: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface CatalogInput {
  name: string;
  description: string;
  categoryId: string;
}

export class AdminCatalogAccessError extends Error {
  constructor() {
    super("Administrator access is required to manage the catalog.");
    this.name = "AdminCatalogAccessError";
  }
}

export class AdminCatalogRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminCatalogRecordError";
  }
}

export class AdminCatalogReferencesError extends Error {
  constructor(public readonly references: string[]) {
    super(`This record is still referenced by: ${references.join(", ")}.`);
    this.name = "AdminCatalogReferencesError";
  }
}

async function requireAdmin(): Promise<User> {
  const user = auth.currentUser;

  if (!user || !(await verifyAdminAccess(user))) {
    throw new AdminCatalogAccessError();
  }

  if (auth.currentUser?.uid !== user.uid) {
    throw new AdminCatalogAccessError();
  }

  return user;
}

function isOptionalStringOrNull(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isManagedCatalogRecord(data: DocumentData): boolean {
  return (
    typeof data.name === "string" &&
    data.name.trim().length > 0 &&
    typeof data.createdBy === "string" &&
    data.createdBy.length > 0 &&
    data.createdAt instanceof Timestamp &&
    typeof data.updatedBy === "string" &&
    data.updatedBy.length > 0 &&
    data.updatedAt instanceof Timestamp &&
    isOptionalStringOrNull(data.description) &&
    isOptionalStringOrNull(data.categoryId)
  );
}

function mapCatalogRecord(
  id: string,
  data: DocumentData
): AdminCatalogRecord {
  const editable = isManagedCatalogRecord(data);

  return {
    id,
    name: typeof data.name === "string" ? data.name : "Unrecognized catalog record",
    description:
      typeof data.description === "string" ? data.description : undefined,
    categoryId:
      typeof data.categoryId === "string" ? data.categoryId : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    editable,
  };
}

async function getCatalogPage(
  collectionName: "skills" | "categories",
  lastDocument: QueryDocumentSnapshot<DocumentData> | null
): Promise<AdminCatalogPage> {
  await requireAdmin();

  const recordsQuery = query(
    collection(db, collectionName),
    orderBy(documentId()),
    ...(lastDocument ? [startAfter(lastDocument)] : []),
    limit(CATALOG_PAGE_SIZE + 1)
  );
  const snapshot = await getDocs(recordsQuery);
  const visibleDocuments = snapshot.docs.slice(0, CATALOG_PAGE_SIZE);

  return {
    records: visibleDocuments.map((record) =>
      mapCatalogRecord(record.id, record.data())
    ),
    lastDocument:
      visibleDocuments.length > 0
        ? visibleDocuments[visibleDocuments.length - 1]
        : null,
    hasMore: snapshot.docs.length > CATALOG_PAGE_SIZE,
  };
}

export function getAdminSkillsPage(
  lastDocument: QueryDocumentSnapshot<DocumentData> | null
): Promise<AdminCatalogPage> {
  return getCatalogPage("skills", lastDocument);
}

export function getAdminCategoriesPage(
  lastDocument: QueryDocumentSnapshot<DocumentData> | null
): Promise<AdminCatalogPage> {
  return getCatalogPage("categories", lastDocument);
}

async function validateInput(input: CatalogInput): Promise<{
  name: string;
  description: string | null;
  categoryId: string | null;
}> {
  const name = input.name.trim();
  const description = input.description.trim();
  const categoryId = input.categoryId.trim();

  if (!name) {
    throw new AdminCatalogRecordError("A name is required.");
  }

  if (name.length > 100) {
    throw new AdminCatalogRecordError("Names must be 100 characters or fewer.");
  }

  if (description.length > 1000) {
    throw new AdminCatalogRecordError(
      "Descriptions must be 1,000 characters or fewer."
    );
  }

  if (categoryId) {
    await requireAdmin();
    const categorySnapshot = await getDoc(doc(db, "categories", categoryId));
    if (!categorySnapshot.exists()) {
      throw new AdminCatalogRecordError(
        "The selected category no longer exists."
      );
    }

    if (!isManagedCatalogRecord(categorySnapshot.data())) {
      throw new AdminCatalogRecordError(
        "The selected category does not use the approved catalog schema."
      );
    }
  }

  return {
    name,
    description: description || null,
    categoryId: categoryId || null,
  };
}

async function assertUniqueName(
  collectionName: "skills" | "categories",
  name: string,
  excludingId?: string
): Promise<void> {
  const duplicateSnapshot = await getDocs(
    query(
      collection(db, collectionName),
      where("name", "==", name)
    )
  );
  const duplicate = duplicateSnapshot.docs.find(
    (document) => document.id !== excludingId
  );

  if (duplicate) {
    throw new AdminCatalogRecordError(
      `A ${collectionName === "skills" ? "skill" : "category"} with this exact name already exists.`
    );
  }
}

export async function createAdminSkill(input: CatalogInput): Promise<void> {
  const admin = await requireAdmin();
  const validated = await validateInput(input);
  await assertUniqueName("skills", validated.name);

  const newSkill = doc(collection(db, "skills"));
  await setDoc(newSkill, {
    ...validated,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: admin.uid,
    updatedBy: admin.uid,
  });
}

export async function updateAdminSkill(
  skillId: string,
  input: CatalogInput
): Promise<void> {
  const admin = await requireAdmin();
  const validated = await validateInput(input);
  const skillReference = doc(db, "skills", skillId);
  await assertUniqueName("skills", validated.name, skillId);
  const originalSnapshot = await getDoc(skillReference);

  if (
    !originalSnapshot.exists() ||
    !isManagedCatalogRecord(originalSnapshot.data())
  ) {
    throw new AdminCatalogRecordError(
      "This skill does not use the approved catalog schema and cannot be edited safely."
    );
  }

  const previousName = originalSnapshot.get("name") as string;
  if (previousName !== validated.name) {
    const nameReferenceIndexes = [1, 3, 5, 7, 8, 10];
    const snapshots = await Promise.all(
      nameReferenceIndexes.map((index) =>
        getDocs(skillReferenceQueries(skillId, previousName)[index])
      )
    );
    const references = snapshots
      .map((snapshot, index) =>
        snapshot.empty
          ? null
          : referenceName(nameReferenceIndexes[index])
      )
      .filter((reference): reference is string => reference !== null);

    if (references.length > 0) {
      throw new AdminCatalogReferencesError(references);
    }
  }

  await runTransaction(db, async (transaction) => {
    const skillSnapshot = await transaction.get(skillReference);
    if (
      !skillSnapshot.exists() ||
      !isManagedCatalogRecord(skillSnapshot.data()) ||
      skillSnapshot.get("name") !== previousName
    ) {
      throw new AdminCatalogRecordError(
        "This skill changed while it was being edited. Reload and try again."
      );
    }
    transaction.update(skillReference, {
      ...validated,
      updatedAt: serverTimestamp(),
      updatedBy: admin.uid,
    });
  });
}

function skillReferenceQueries(
  skillId: string,
  skillName: string
) {
  return [
    query(
      collection(db, "userSkills"),
      where("skillName", "==", skillId),
      limit(1)
    ),
    query(
      collection(db, "userSkills"),
      where("skillName", "==", skillName),
      limit(1)
    ),
    query(
      collection(db, "exchangeRequests"),
      where("offeredSkillId", "==", skillId),
      limit(1)
    ),
    query(
      collection(db, "exchangeRequests"),
      where("offeredSkillId", "==", skillName),
      limit(1)
    ),
    query(
      collection(db, "exchangeRequests"),
      where("requestedSkillId", "==", skillId),
      limit(1)
    ),
    query(
      collection(db, "exchangeRequests"),
      where("requestedSkillId", "==", skillName),
      limit(1)
    ),
    query(
      collection(db, "sessions"),
      where("skillId", "==", skillId),
      limit(1)
    ),
    query(
      collection(db, "sessions"),
      where("skillId", "==", skillName),
      limit(1)
    ),
    query(
      collection(db, "matches"),
      where("matchedSkills", "array-contains", skillName),
      limit(1)
    ),
    query(
      collection(db, "matches"),
      where("matchedSkills", "array-contains", skillId),
      limit(1)
    ),
    query(
      collection(db, "matches"),
      where("sharedSkills", "array-contains", skillName),
      limit(1)
    ),
    query(
      collection(db, "matches"),
      where("sharedSkills", "array-contains", skillId),
      limit(1)
    ),
  ];
}

export async function deleteAdminSkill(skillId: string): Promise<void> {
  await requireAdmin();
  const skillReference = doc(db, "skills", skillId);
  const skillSnapshot = await getDoc(skillReference);

  if (
    !skillSnapshot.exists() ||
    !isManagedCatalogRecord(skillSnapshot.data())
  ) {
    throw new AdminCatalogRecordError(
      "This skill does not use the approved catalog schema and cannot be deleted safely."
    );
  }

  const skill = mapCatalogRecord(skillSnapshot.id, skillSnapshot.data());
  const querySnapshots = await Promise.all(
    skillReferenceQueries(skill.id, skill.name).map((referenceQuery) =>
      getDocs(referenceQuery)
    )
  );
  const references = querySnapshots
    .map((snapshot, index) =>
      snapshot.empty ? null : referenceName(index)
    )
    .filter((reference): reference is string => reference !== null);

  if (references.length > 0) {
    throw new AdminCatalogReferencesError(references);
  }

  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(skillReference);
    if (
      !currentSnapshot.exists() ||
      !isManagedCatalogRecord(currentSnapshot.data()) ||
      currentSnapshot.get("name") !== skill.name
    ) {
      throw new AdminCatalogRecordError(
        "This skill changed while it was being checked. Reload and try again."
      );
    }
    transaction.delete(skillReference);
  });
}

function referenceName(index: number): string {
  const names = [
    "user skills by catalog ID",
    "user skills by skill name",
    "exchange offers by catalog ID",
    "exchange offers by skill name",
    "exchange requests by catalog ID",
    "exchange requests by skill name",
    "sessions by catalog ID",
    "sessions by skill name",
    "matching results by skill name",
    "matching results by catalog ID",
    "shared matching results by skill name",
    "shared matching results by catalog ID",
  ];
  return names[index] ?? "existing records";
}

export async function createAdminCategory(
  name: string,
  description: string
): Promise<void> {
  const admin = await requireAdmin();
  const validated = await validateInput({
    name,
    description,
    categoryId: "",
  });
  await assertUniqueName("categories", validated.name);
  const newCategory = doc(collection(db, "categories"));
  await setDoc(newCategory, {
    name: validated.name,
    description: validated.description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: admin.uid,
    updatedBy: admin.uid,
  });
}

export async function updateAdminCategory(
  categoryId: string,
  name: string,
  description: string
): Promise<void> {
  const admin = await requireAdmin();
  const validated = await validateInput({
    name,
    description,
    categoryId: "",
  });
  await assertUniqueName("categories", validated.name, categoryId);
  const categoryReference = doc(db, "categories", categoryId);
  const originalSnapshot = await getDoc(categoryReference);
  if (
    !originalSnapshot.exists() ||
    !isManagedCatalogRecord(originalSnapshot.data())
  ) {
    throw new AdminCatalogRecordError(
      "This category does not use the approved catalog schema and cannot be edited safely."
    );
  }

  const previousName = originalSnapshot.get("name") as string;
  if (previousName !== validated.name) {
    const nameReferences = await Promise.all([
      getDocs(
        query(
          collection(db, "userSkills"),
          where("category", "==", previousName),
          limit(1)
        )
      ),
      getDocs(
        query(
          collection(db, "skills"),
          where("category", "==", previousName),
          limit(1)
        )
      ),
    ]);
    const references = nameReferences
      .map((snapshot, index) =>
        snapshot.empty
          ? null
          : `${["user skills", "skills"][index]} using the legacy category name`
      )
      .filter((reference): reference is string => reference !== null);

    if (references.length > 0) {
      throw new AdminCatalogReferencesError(references);
    }
  }

  await runTransaction(db, async (transaction) => {
    const categorySnapshot = await transaction.get(categoryReference);
    if (
      !categorySnapshot.exists() ||
      !isManagedCatalogRecord(categorySnapshot.data()) ||
      categorySnapshot.get("name") !== previousName
    ) {
      throw new AdminCatalogRecordError(
        "This category changed while it was being edited. Reload and try again."
      );
    }
    transaction.update(categoryReference, {
      name: validated.name,
      description: validated.description,
      updatedAt: serverTimestamp(),
      updatedBy: admin.uid,
    });
  });
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  await requireAdmin();
  const categoryReference = doc(db, "categories", categoryId);
  const categorySnapshot = await getDoc(categoryReference);

  if (
    !categorySnapshot.exists() ||
    !isManagedCatalogRecord(categorySnapshot.data())
  ) {
    throw new AdminCatalogRecordError(
      "This category does not use the approved catalog schema and cannot be deleted safely."
    );
  }

  const category = mapCatalogRecord(categorySnapshot.id, categorySnapshot.data());
  const references = await Promise.all([
    getDocs(
      query(
        collection(db, "skills"),
        where("categoryId", "==", category.id),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "skills"),
        where("category", "==", category.id),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "skills"),
        where("category", "==", category.name),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "userSkills"),
        where("categoryId", "==", category.id),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "userSkills"),
        where("category", "==", category.id),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "userSkills"),
        where("category", "==", category.name),
        limit(1)
      )
    ),
  ]);
  const referencesByCollection = references
    .map((snapshot, index) =>
      snapshot.empty
        ? null
        : [
            "skills by category ID",
            "skills by category field",
            "skills by category name",
            "user skills by category ID",
            "user skills by category field",
            "user skills by category name",
          ][index]
    )
    .filter((reference): reference is string => reference !== null);

  if (referencesByCollection.length > 0) {
    throw new AdminCatalogReferencesError(referencesByCollection);
  }

  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(categoryReference);
    if (
      !currentSnapshot.exists() ||
      !isManagedCatalogRecord(currentSnapshot.data()) ||
      currentSnapshot.get("name") !== category.name
    ) {
      throw new AdminCatalogRecordError(
        "This category changed while it was being checked. Reload and try again."
      );
    }
    transaction.delete(categoryReference);
  });
}
